import PDFDocument from "pdfkit";
import path from "path";

type Material = { id?: number; title?: string | null };
type Size = { width?: number; height?: number; depth?: number };
type OrderItem = {
  productId?: string;
  model_name?: string | null;
  qty?: number | null;
  unit_price?: number | null;
  line_total?: number | null; // <- в item
  size?: Size | null;
  body_material?: Material | null;
  front_material?: Material | null;
  product_img?: string | null;
};
type Order = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  delivery_method?: string | null;
  delivery_address?: string | null;
  payment_method?: string | null;
  prepayment_agreement?: boolean | null;
  comment?: string | null;
  items?: OrderItem[] | null;
};

const money = (n?: number | null) =>
  typeof n === "number" ? `${n.toLocaleString("uk-UA")} грн` : "";

const itemsTotal = (items: OrderItem[] = []) =>
  items.reduce(
    (s, it) =>
      s +
      (Number(
        it.line_total ?? Number(it.unit_price ?? 0) * Number(it.qty ?? 0)
      ) || 0),
    0
  );

const getAdminEmail = async (): Promise<string> => {
  try {
    const shop = await strapi
      .documents("api::shop.shop")
      .findFirst({ fields: ["orders_email"] });
    return (shop as any)?.orders_email || process.env.ORDERS_EMAIL || "";
  } catch (e) {
    strapi.log.warn(`[order lifecycles] cannot read Shop.orders_email: ${e}`);
    return process.env.ORDERS_EMAIL || "";
  }
};

// Генерація PDF у пам'яті
const buildOrderPdf = (o: Order): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (d) => chunks.push(d as Buffer));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Підключаємо Noto Sans з /assets/fonts
    const fontsDir = path.join(process.cwd(), "assets", "fonts");
    try {
      doc.registerFont("BodyBold", path.join(fontsDir, "NotoSans-Bold.ttf"));
      doc.registerFont("Body", path.join(fontsDir, "NotoSans-Regular.ttf"));
    } catch (e) {
      strapi.log.warn(
        `[order pdf] fonts not found, fallback to Helvetica: ${e}`
      );
    }

    // Заголовок
    doc.font("BodyBold").fontSize(18).text(`Замовлення #${o.id}`);
    doc.moveDown(0.5);

    // Тіло
    doc.font("Body").fontSize(10);
    doc.text(`Ім'я: ${o.first_name ?? ""} ${o.last_name ?? ""}`);
    doc.text(`Email: ${o.email ?? ""}`);
    doc.text(`Телефон: ${o.phone ?? ""}`);
    if (o.delivery_method) doc.text(`Доставка: ${o.delivery_method}`);
    if (o.delivery_address) doc.text(`Адреса: ${o.delivery_address}`);
    if (o.payment_method) doc.text(`Оплата: ${o.payment_method}`);
    if (typeof o.prepayment_agreement === "boolean")
      doc.text(`Передоплата: ${o.prepayment_agreement ? "так" : "ні"}`);
    if (o.comment) {
      doc.moveDown(0.3);
      doc.text(`Коментар: ${o.comment}`);
    }

    // Табличка позицій
    doc.moveDown(1);
    doc.font("BodyBold").fontSize(12).text("Позиції", { underline: true });
    doc.moveDown(0.4);

    const col = (w: number, txt: string) =>
      doc.text(txt, { width: w, continued: true });

    doc.font("BodyBold").fontSize(10);
    col(200, "Модель");
    col(50, "К-сть");
    col(80, "Ціна од.");
    col(80, "Сума");
    doc.text("Параметри");
    doc.moveDown(0.2).font("Body");

    (o.items ?? []).forEach((it) => {
      const lt = Number(
        it.line_total ?? Number(it.unit_price ?? 0) * Number(it.qty ?? 0)
      );
      const params: string[] = [];
      if (it.size) {
        const { width, height, depth } = it.size as Size;
        const parts = [
          width ? `${width}W` : "",
          height ? `${height}H` : "",
          depth ? `${depth}D` : "",
        ].filter(Boolean);
        if (parts.length) params.push(parts.join("×"));
      }
      if (it.body_material?.title)
        params.push(`Корпус: ${it.body_material.title}`);
      if (it.front_material?.title)
        params.push(`Фасад: ${it.front_material.title}`);

      col(200, it.model_name ?? "");
      col(50, String(it.qty ?? "")); // кількість
      col(80, money(Number(it.unit_price ?? 0))); // ціна за одиницю
      col(80, money(lt)); // сума по позиції
      doc.text(params.join("; ")); // параметри
    });

    const total = itemsTotal(o.items ?? []);
    doc.moveDown(1);
    doc
      .font("BodyBold")
      .fontSize(12)
      .text(`Разом: ${money(total)}`);

    doc.end();
  });

export default {
  async afterCreate(event: { result: Order }) {
    const order = event.result;
    strapi.log.info(`[order afterCreate] start id=${order?.id}`);

    try {
      const adminEmail = await getAdminEmail();
      if (!adminEmail) {
        strapi.log.warn("[order afterCreate] no adminEmail → skip");
        return;
      }

      const pdf = await buildOrderPdf(order);
      const attachments = [
        {
          filename: `order-${order.id}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ];

      // адміну
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: adminEmail,
          subject: `Нове замовлення #${order.id}`,
          html: `<p>Деталі у вкладеному PDF.</p>`,
          attachments,
        });

      // клієнту
      if (order.email) {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: order.email,
            subject: `Ваше замовлення #${order.id} отримано`,
            html: `<p>Дякуємо за замовлення! Деталі у вкладеному PDF.</p>`,
            attachments,
          });
      }

      strapi.log.info("[order afterCreate] emails with PDF sent ✅");
    } catch (err) {
      strapi.log.error("[order afterCreate] email error ❌", err);
    }
  },
};
