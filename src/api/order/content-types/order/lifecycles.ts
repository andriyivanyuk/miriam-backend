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

// -------- PDF --------
const buildOrderPdf = (o: Order): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (d) => chunks.push(d as Buffer));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Шрифти (Noto Sans з /assets/fonts)
    const fontsDir = path.join(process.cwd(), "assets", "fonts");
    let hasFonts = true;
    try {
      doc.registerFont("Body", path.join(fontsDir, "NotoSans-Regular.ttf"));
      doc.registerFont("BodyBold", path.join(fontsDir, "NotoSans-Bold.ttf"));
      doc.font("Body");
    } catch (e) {
      hasFonts = false;
      strapi.log.warn(
        `[order pdf] fonts not found, fallback to Helvetica: ${e}`
      );
      doc.font("Helvetica");
    }
    const FONT = hasFonts ? "Body" : "Helvetica";
    const FONT_BOLD = hasFonts ? "BodyBold" : "Helvetica-Bold";

    // Заголовок + реквізити
    doc.font(FONT_BOLD).fontSize(22).text(`Замовлення #${o.id}`);
    doc.moveDown(0.8);

    doc.font(FONT).fontSize(11);
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

    doc.moveDown(1.2);
    doc.font(FONT_BOLD).fontSize(14).text("Позиції");
    doc.moveDown(0.4);

    // ----- Таблиця -----
    const startX = doc.page.margins.left; // 40
    let y = doc.y;
    const colWidths = [180, 40, 90, 90, 115]; // = 515 (A4 width - margins)
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const cellPadX = 6;
    const cellPadY = 6;

    const addPageIfNeeded = (rowHeight: number) => {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (y + rowHeight > bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };

    const drawRow = (cells: string[], isHeader = false) => {
      doc.font(isHeader ? FONT_BOLD : FONT).fontSize(10);
      // обрахунок висоти рядка за найбільшою висотою комірки
      const heights = cells.map((txt, i) =>
        doc.heightOfString(txt, { width: colWidths[i] - cellPadX * 2 })
      );
      const rowH = Math.max(...heights) + cellPadY * 2;

      addPageIfNeeded(rowH);

      // рамки комірок + текст
      let x = startX;
      for (let i = 0; i < cells.length; i++) {
        doc.rect(x, y, colWidths[i], rowH).stroke(); // рамка
        doc.text(cells[i], x + cellPadX, y + cellPadY, {
          width: colWidths[i] - cellPadX * 2,
        });
        x += colWidths[i];
      }
      y += rowH;
    };

    // Заголовок таблиці
    drawRow(["Модель", "К-сть", "Ціна од.", "Сума", "Параметри"], true);

    // Рядки
    (o.items ?? []).forEach((it) => {
      const qty = Number(it.qty ?? 0);
      const unit = Number(it.unit_price ?? 0);
      const sum = Number(it.line_total ?? unit * qty);

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

      drawRow(
        [
          it.model_name ?? "",
          qty ? String(qty) : "",
          money(unit),
          money(sum),
          params.join("; "),
        ],
        false
      );
    });

    // Підсумок
    doc.moveDown(0.8);
    const total = itemsTotal(o.items ?? []);
    doc
      .font(FONT_BOLD)
      .fontSize(13)
      .text(`Разом: ${money(total)}`);

    doc.end();
  });

// -------- lifecycle --------
export default {
  async afterCreate(event: {
    result: Order & { id: number; documentId: string };
    params?: { data?: Partial<Order> };
  }) {
    // 1) перечитуємо щойно створене замовлення разом із items
    const full = await strapi.documents("api::order.order").findOne({
      documentId: event.result.documentId, // ← string (у твоїх логах є)
      populate: { items: true }, // ← повторюваний компонент
    });

    // 2) формуємо дані для PDF (items тепер гарантовано підвантажені)
    const orderForPdf: Order = {
      id: event.result.id,
      first_name: event.result.first_name,
      last_name: event.result.last_name,
      email: event.result.email,
      phone: event.result.phone,
      delivery_method: event.result.delivery_method,
      delivery_address: event.result.delivery_address,
      payment_method: event.result.payment_method,
      prepayment_agreement: event.result.prepayment_agreement,
      comment: event.result.comment,
      items: (full as { items?: OrderItem[] }).items ?? [],
    };

    // (короткий лог — тільки на час діагностики)
    strapi.log.info(
      `[order afterCreate] items for PDF: ${orderForPdf.items?.length ?? 0}`
    );

    try {
      const adminEmail = await getAdminEmail();
      if (!adminEmail) {
        strapi.log.warn("[order afterCreate] no adminEmail → skip");
        return;
      }

      const pdf = await buildOrderPdf(orderForPdf);
      const attachments = [
        {
          filename: `order-${orderForPdf.id}.pdf`,
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
          subject: `Нове замовлення #${orderForPdf.id}`,
          html: `<p>Деталі у вкладеному PDF.</p>`,
          attachments,
        });

      // клієнту
      if (orderForPdf.email) {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: orderForPdf.email,
            subject: `Ваше замовлення #${orderForPdf.id} отримано`,
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
