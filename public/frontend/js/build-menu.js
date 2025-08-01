const ejs = require("ejs");
const fs = require("fs");
const https = require("https");

const API_URL = "https://miriam-backend.onrender.com/api/categories?populate=*";
const TEMPLATE_FILE = "./frontend/templates/menu.ejs";
const OUTPUT_FILE = "./frontend/includes/menu.html";

https
  .get(API_URL, (res) => {
    let raw = "";
    res.on("data", (chunk) => (raw += chunk));
    res.on("end", async () => {
      try {
        const data = JSON.parse(raw);
        const categories = data.data
          .map((cat) => {
            const attrs = cat.attributes || {};
            return {
              slug: attrs.slug,
              name: attrs.name,
              iconPath: attrs.icon?.data?.attributes?.url || "",
            };
          })
          .filter((cat) => cat.slug && cat.name);

        const template = fs.readFileSync(TEMPLATE_FILE, "utf8");
        const html = ejs.render(template, { categories });

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
