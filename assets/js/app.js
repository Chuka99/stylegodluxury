import { BRAND, LOOKS, PRODUCTS, BLOG_POSTS } from "./data.js";

/* =========================
   Helpers
========================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const displayPrice = (price) => (Number(price) > 0 ? naira.format(price) : "DM for price");

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* =========================
   Brand binding
========================= */
function bindBrand() {
  $$(".brandName").forEach((el) => (el.textContent = BRAND.name));
  $$(".brandTagline").forEach((el) => (el.textContent = BRAND.tagline));

  $$(".linkIG").forEach((el) => (el.href = BRAND.instagram));
  $$(".linkTikTok").forEach((el) => (el.href = BRAND.tiktok));

  const wa = $("#waNumber");
  if (wa) wa.textContent = `+${BRAND.whatsappNumber || ""}`;
}

/* =========================
   Footer year (no inline script)
========================= */
function setYear() {
  $$("#year").forEach((el) => (el.textContent = String(new Date().getFullYear())));
}

/* =========================
   Toast
========================= */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* =========================
   Cart (localStorage)
========================= */
const CART_KEY = "stylegod_sophie_cart_v1";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartCount();
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
}

// Totals ignore DM-for-price (price <= 0)
function cartTotals() {
  const cart = getCart();
  let total = 0;
  for (const item of cart) {
    const p = PRODUCTS.find((x) => x.id === item.id);
    if (!p) continue;
    if (Number(p.price) > 0) total += Number(p.price) * Number(item.qty);
  }
  return total;
}

function addToCart(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;

  const cart = getCart();
  const found = cart.find((x) => x.id === id);

  if (found) found.qty += 1;
  else cart.push({ id, qty: 1 });

  setCart(cart);
  toast(`${p.name} added ✔️`);
}

function removeFromCart(id) {
  setCart(getCart().filter((x) => x.id !== id));
  renderCartPanel();
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find((x) => x.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) setCart(cart.filter((x) => x.id !== id));
  else setCart(cart);

  renderCartPanel();
}

/* =========================
   WhatsApp Checkout
========================= */
function buildWhatsAppMessage() {
  const cart = getCart();
  if (cart.length === 0) return "Hello Stylegod, I want to make an order.";

  const lines = [];
  lines.push("Hello Stylegod, I want to order the following items:");
  lines.push("");

  for (const item of cart) {
    const p = PRODUCTS.find((x) => x.id === item.id);
    if (!p) continue;

    if (Number(p.price) > 0) {
      lines.push(`• ${p.name} x${item.qty} — ${naira.format(Number(p.price) * Number(item.qty))}`);
    } else {
      lines.push(`• ${p.name} x${item.qty} — Price: request`);
    }
  }

  lines.push("");
  lines.push(`Total (priced items): ${naira.format(cartTotals())}`);
  lines.push("");
  lines.push("Delivery details:");
  lines.push("Name:");
  lines.push("Phone:");
  lines.push("Address:");
  lines.push("Closest landmark:");
  return lines.join("\n");
}

function openWhatsAppCheckout(customMsg) {
  const num = (BRAND.whatsappNumber || "").trim();
  if (!num) {
    toast("Add your WhatsApp number in data.js ❗");
    return;
  }
  const text = encodeURIComponent(customMsg || buildWhatsAppMessage());
  const url = `https://wa.me/${num}?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================
   Header cart count
========================= */
function renderCartCount() {
  const el = $("#cartCount");
  if (!el) return;
  el.textContent = String(cartCount());
}

/* =========================
   Looks (Home + Gallery)
========================= */
function renderLooks(targetId) {
  const grid = $(`#${targetId}`);
  if (!grid) return;

  grid.innerHTML = LOOKS.map(
    (l) => `
    <a class="lookCard" href="${BRAND.instagram}" target="_blank" rel="noreferrer">
      <img src="${l.img}" alt="${l.title}" loading="lazy" />
      <div class="lookMeta">
        <div class="lookTitle">${l.title}</div>
        <div class="lookSub">View on Instagram</div>
      </div>
    </a>
  `
  ).join("");
}

/* =========================
   Shop Products + Filters + Search
========================= */
function renderProducts() {
  const grid = $("#productGrid");
  if (!grid) return;

  const filters = $("#categoryFilters");
  const search = $("#shopSearch");

  const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];

  // Build filters once
  if (filters && !filters.dataset.ready) {
    filters.dataset.ready = "true";
    filters.innerHTML = categories
      .map((c, idx) => `<button class="chip" data-cat="${c}" data-active="${idx === 0}">${c}</button>`)
      .join("");

    $$(".chip", filters).forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".chip", filters).forEach((x) => (x.dataset.active = "false"));
        chip.dataset.active = "true";
        paint();
      });
    });
  }

  const getActiveCat = () => filters?.querySelector("[data-active='true']")?.dataset?.cat ?? "All";

  const paint = () => {
    const q = (search?.value ?? "").trim().toLowerCase();
    const cat = getActiveCat();

    const list = PRODUCTS.filter((p) => {
      const okCat = cat === "All" ? true : p.category === cat;
      const hay = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      const okQ = !q || hay.includes(q);
      return okCat && okQ;
    });

    grid.innerHTML = list
      .map(
        (p) => `
      <div class="productCard">
        <button class="productImgBtn" data-open="${p.id}" aria-label="Open ${p.name}">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
        </button>

        <div class="productBody">
          <div class="productTop">
            <div>
              <div class="pill">${p.category}</div>
              <div class="productName">${p.name}</div>
            </div>
            <div class="productPrice">${displayPrice(p.price)}</div>
          </div>

          <div class="productDesc">${p.description}</div>

          <div class="productActions">
            <button class="btn btnPrimary" data-add="${p.id}">Add to cart</button>
            <button class="btn btnGhost" data-open="${p.id}">Details</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    $$("[data-add]").forEach((b) => b.addEventListener("click", () => addToCart(b.dataset.add)));
    $$("[data-open]").forEach((b) => b.addEventListener("click", () => openProductModal(b.dataset.open)));
  };

  if (search && !search.dataset.ready) {
    search.dataset.ready = "true";
    search.addEventListener("input", paint);
  }

  paint();
}

/* =========================
   Product Modal
========================= */
function setupModal() {
  const modal = $("#modal");
  if (!modal) return;

  $("#modalClose")?.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal.classList.remove("open");
  });
}

function openProductModal(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  const modal = $("#modal");
  const content = $("#modalContent");
  if (!p || !modal || !content) return;

  content.innerHTML = `
    <div class="modalGrid">
      <img class="modalImg" src="${p.img}" alt="${p.name}" />
      <div>
        <div class="pill">${p.category}</div>
        <h2 class="modalTitle">${p.name}</h2>
        <div class="modalPrice">${displayPrice(p.price)}</div>
        <p class="modalDesc">${p.description}</p>

        <div class="modalBtns">
          <button class="btn btnPrimary" id="modalAdd">Add to cart</button>
          <button class="btn" id="modalWA">WhatsApp to order</button>
        </div>

        <div class="finePrint">
          Checkout goes directly to WhatsApp with your cart items and total in Naira.
        </div>
      </div>
    </div>
  `;

  $("#modalAdd")?.addEventListener("click", () => addToCart(p.id));
  $("#modalWA")?.addEventListener("click", () => openWhatsAppCheckout());

  modal.classList.add("open");
}

/* =========================
   Cart Panel UI
========================= */
function setupCartPanel() {
  const panel = $("#cartPanel");
  if (!panel) return;

  $("#openCart")?.addEventListener("click", () => {
    panel.classList.add("open");
    renderCartPanel();
  });

  $("#closeCart")?.addEventListener("click", () => panel.classList.remove("open"));

  $("#checkoutBtn")?.addEventListener("click", () => openWhatsAppCheckout());
}

function renderCartPanel() {
  const list = $("#cartItems");
  const totalEl = $("#cartTotal");
  if (!list || !totalEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    list.innerHTML = `<div class="emptyState">Your cart is empty. Add something soft + classy ✨</div>`;
    totalEl.textContent = naira.format(0);
    return;
  }

  list.innerHTML = cart
    .map((item) => {
      const p = PRODUCTS.find((x) => x.id === item.id);
      if (!p) return "";

      const lineTotal =
        Number(p.price) > 0 ? naira.format(Number(p.price) * Number(item.qty)) : "Price: request";

      return `
        <div class="cartRow">
          <img class="cartThumb" src="${p.img}" alt="${p.name}" />
          <div class="cartInfo">
            <div class="cartName">${p.name}</div>
            <div class="cartMeta">${displayPrice(p.price)} • <span class="pill">${p.category}</span></div>
            <div class="qty">
              <button class="qtyBtn" data-qty="${p.id}" data-d="-1">–</button>
              <span class="qtyNum">${item.qty}</span>
              <button class="qtyBtn" data-qty="${p.id}" data-d="1">+</button>
              <button class="linkBtn" data-remove="${p.id}">Remove</button>
            </div>
          </div>
          <div class="cartLine">${lineTotal}</div>
        </div>
      `;
    })
    .join("");

  totalEl.textContent = naira.format(cartTotals());

  $$("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromCart(b.dataset.remove)));
  $$("[data-qty]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.qty, Number(b.dataset.d))));
}

/* =========================
   Blog list + single post
========================= */
function renderBlogList() {
  const grid = $("#blogGrid");
  if (!grid) return;

  grid.innerHTML = BLOG_POSTS.slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (p) => `
      <a class="postCard" href="post.html?slug=${encodeURIComponent(p.slug)}">
        <img src="${p.cover}" alt="${p.title}" loading="lazy" />
        <div class="postBody">
          <div class="postDate">${fmtDate(p.date)}</div>
          <div class="postTitle">${p.title}</div>
          <div class="postExcerpt">${p.excerpt}</div>
          <div class="postRead">Read post →</div>
        </div>
      </a>
    `
    )
    .join("");
}

function renderPost() {
  const wrap = $("#postWrap");
  if (!wrap) return;

  const slug = new URLSearchParams(location.search).get("slug");
  const post = BLOG_POSTS.find((p) => p.slug === slug) ?? BLOG_POSTS[0];

  wrap.innerHTML = `
    <div class="postHero">
      <img src="${post.cover}" alt="${post.title}" />
    </div>
    <div class="postHeader">
      <div class="postDate">${fmtDate(post.date)}</div>
      <h1 class="postH1">${post.title}</h1>
      <p class="postLead">${post.excerpt}</p>
    </div>
    <article class="postContent">${mdToHtml(post.content)}</article>
  `;
}

// Small markdown-ish renderer (safe: escapes HTML)
function mdToHtml(md) {
  const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const lines = esc(md).split("\n");

  const html = lines
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (t.startsWith("### ")) return `<h3>${t.slice(4)}</h3>`;
      if (t.startsWith("## ")) return `<h2>${t.slice(3)}</h2>`;
      if (t.startsWith("- ")) return `<li>${t.slice(2)}</li>`;
      if (t.startsWith("**") && t.endsWith("**") && t.length > 4) return `<p><strong>${t.slice(2, -2)}</strong></p>`;
      return `<p>${t}</p>`;
    })
    .join("\n");

  // Wrap consecutive <li> in <ul>
  return html.replace(/(?:<li>.*<\/li>\s*)+/g, (m) => `<ul>${m}</ul>`);
}

/* =========================
   Contact page actions
========================= */
function setupContact() {
  const form = $("#contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Message received ✔️");
      form.reset();
    });
  }

  $("#whatsappBtn")?.addEventListener("click", () => {
    openWhatsAppCheckout("Hello Stylegod, I’d like to make an enquiry.");
  });
}

/* =========================
   Boot
========================= */
function init() {
  bindBrand();
  setYear();

  setupModal();
  setupCartPanel();
  setupContact();

  renderCartCount();

  // Safe render calls for whichever page is loaded
  renderLooks("looksGrid");     // home
  renderLooks("galleryGrid");   // gallery
  renderProducts();             // shop + home highlights
  renderBlogList();             // blog page
  renderPost();                 // post page
}

document.addEventListener("DOMContentLoaded", init);
