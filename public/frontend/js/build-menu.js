const fs = require("fs");
const https = require("https");

const API_URL =
  "https://miriam-backend.onrender.com/api/menu-categories?populate=*";
const OUTPUT_FILE = "public/frontend/includes/menu.html";

https
  .get(API_URL, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        const categories = json.data;

        const html = categories
          .map((cat) => {
            const name = cat.name;
            const slug = cat.slug;
            const iconPath = cat.icon?.url;
            const iconUrl = iconPath
              ? `https://miriam-backend.onrender.com${iconPath}`
              : "";

            if (!name || !slug) {
              console.warn(
                "⚠️ Пропущено категорію через відсутність name/slug",
                cat
              );
              return "";
            }

            return `
  <li class="item">
    <a href="/frontend/shop.html?category=${slug}" class="hasicon" title="${name}">
      <img src="${iconUrl}" alt="${name}" />
      ${name.toUpperCase()}
    </a>
  </li>`;
          })
          .filter(Boolean)
          .join("\n");

        fs.writeFileSync(OUTPUT_FILE, html, "utf8");
        console.log("✅ Меню згенеровано успішно!");
      } catch (error) {
        console.error("❌ Помилка при генерації меню:", error.message);
      }
    });
  })
  .on("error", (err) => {
    console.error("❌ Помилка HTTP:", err.message);
  });
