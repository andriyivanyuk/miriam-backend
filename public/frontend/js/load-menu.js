async function loadCategories() {
  const res = await fetch(
    "https://miriam-backend.onrender.com/api/menu-categories?populate=*"
  );
  const json = await res.json();
  const categories = json.data;

  const menuList = document.querySelector("ul.menu.level1");

  categories.forEach((cat) => {
    const name = cat.attributes.name;
    const slug = cat.attributes.slug;
    const iconPath = cat.attributes.icon?.data?.attributes?.url;
    const iconUrl = iconPath
      ? `https://miriam-backend.onrender.com${iconPath}`
      : "img/placeholder.png";

    const li = document.createElement("li");
    li.classList.add("item");

    li.innerHTML = `
      <a href="#${slug}" class="hasicon" title="${name}">
        <img src="${iconUrl}" alt="${name}" />${name}
      </a>
    `;

    menuList.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", loadCategories);
