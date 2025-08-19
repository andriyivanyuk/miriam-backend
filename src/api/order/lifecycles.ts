export default {
  async afterCreate(event, { strapi }) {
    const order = event.result;

    try {
      // 1) дістаємо email адміну зі single-type Shop
      const shops = await strapi.entityService.findMany("api::shop.shop", {
        fields: ["orders_email"],
        limit: 1,
      });
      const adminEmail =
        shops?.[0]?.orders_email || process.env.ORDERS_EMAIL || "";

      // якщо немає куди надсилати — просто завершуємо
      if (!adminEmail) return;

      // 2) лист адміну (без вкладень поки)
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: adminEmail,
          subject: `Нове замовлення #${order.id}`,
          html: `
          <p><b>Нове замовлення #${order.id}</b></p>
          <p>Клієнт: ${order.first_name ?? ""} ${order.last_name ?? ""}</p>
          <p>Email: ${order.email ?? ""}</p>
          <p>Сума: ${order.line_total ?? ""}</p>
        `,
        });

      // 3) підтвердження клієнту
      if (order.email) {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: order.email,
            subject: "Ваше замовлення отримано",
            html: `
            <p>Дякуємо! Ваше замовлення #${order.id} отримано.</p>
            <p>Ми з вами зв'яжемося найближчим часом.</p>
          `,
          });
      }
    } catch (err) {
      // Не ламаємо створення замовлення, просто лог
      strapi.log.error("[order afterCreate] email error:", err);
    }
  },
};
