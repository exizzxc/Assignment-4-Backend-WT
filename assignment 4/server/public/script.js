// =======================
// CONFIG
// =======================
const CART_KEY = "cart";
const TOKEN_KEY = "token";

// ✅ assignment4 endpoints
const API_PRODUCTS = "/api/products";
const API_CATEGORIES = "/api/categories";
const API_LOGIN = "/api/auth/login";

// =======================
// CART (оставляем как было)
// =======================
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const total = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll(".cart-badge").forEach((badge) => {
    badge.textContent = total;
  });
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((p) => p.id === product.id);

  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });

  saveCart(cart);
}

function renderCart() {
  const container = document.getElementById("cartContainer");
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = "<p>Cart is empty</p>";
    return;
  }

  container.innerHTML = cart
    .map(
      (p) => `
    <div class="cart-item">
      <img src="${p.img}" width="60" onerror="this.src='/images/placeholder.png'">
      <span>${p.title}</span>
      <b>₸ ${p.price}</b>
      <small>x${p.qty}</small>
    </div>
  `
    )
    .join("");
}

// =======================
// AUTH (JWT)
// =======================
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

// requests with Bearer token if exists
async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

// =======================
// CATALOG LOAD (API)
// =======================
let allProducts = [];
let allCategories = [];

async function loadCategories() {
  try {
    allCategories = await apiFetch(API_CATEGORIES);
  } catch (err) {
    allCategories = [];
  }

  // category dropdown for filter
  const filter = document.getElementById("categoryFilter");
  if (filter) {
    const old = filter.value;

    filter.innerHTML = `<option value="All">All</option>`;
    allCategories.forEach((c) => {
      filter.innerHTML += `<option value="${c._id}">${c.name}</option>`;
    });

    // restore selection if possible
    if ([...filter.options].some((o) => o.value === old)) {
      filter.value = old;
    }
  }

  // admin product create dropdown
  const adminCat = document.getElementById("adminProductCategory");
  if (adminCat) {
    adminCat.innerHTML = `<option value="">No category</option>`;
    allCategories.forEach((c) => {
      adminCat.innerHTML += `<option value="${c._id}">${c.name}</option>`;
    });
  }

  // admin categories list
  renderAdminCategories();
}

async function loadProducts() {
  try {
    allProducts = await apiFetch(API_PRODUCTS);
    applyFilters();
    renderAdminProducts();
  } catch (err) {
    const container = document.getElementById("catalogContainer");
    if (container) container.innerHTML = "<p>Failed to load products</p>";
  }
}

function applyFilters() {
  const container = document.getElementById("catalogContainer");
  if (!container) return;

  const categoryId = document.getElementById("categoryFilter")?.value || "All";
  const min = Number(document.getElementById("priceMin")?.value || 0);
  const max = Number(document.getElementById("priceMax")?.value || Infinity);

  const filtered = allProducts.filter((p) => {
    // product.categoryId может быть Object или null
    const prodCatId = p.categoryId?._id || p.categoryId || null;

    const categoryOk = categoryId === "All" ? true : prodCatId === categoryId;

    return categoryOk && p.price >= min && p.price <= max;
  });

  if (!filtered.length) {
    container.innerHTML = "<p>No products found</p>";
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const catName = p.categoryId?.name ? p.categoryId.name : "No category";
      const img = p.imageUrl || "/images/placeholder.png";

      return `
      <div class="product-card"
        data-id="${p._id}"
        data-title="${p.name}"
        data-price="${p.price}"
        data-img="${img}">
        <img src="${img}" onerror="this.src='/images/placeholder.png'">
        <h3>${p.name}</h3>
        <p>${catName}</p>
        <b>₸ ${p.price}</b>
        <button class="add-to-cart">Add to cart</button>
      </div>
    `;
    })
    .join("");
}

// =======================
// ADMIN UI (minimal, hidden when not logged in)
// =======================
function updateAdminUI() {
  const adminPanel = document.getElementById("adminPanel");
  const authStatus = document.getElementById("authStatusText");
  const btnLogout = document.getElementById("btnLogout");

  const logged = isLoggedIn();

  if (authStatus) authStatus.textContent = logged ? "Logged in ✅" : "Not logged in";
  if (btnLogout) btnLogout.classList.toggle("d-none", !logged);

  if (adminPanel) {
    adminPanel.classList.toggle("d-none", !logged);
  }
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  try {
    const data = await apiFetch(API_LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    setToken(data.token);
    updateAdminUI();

    // close modal
    const modalEl = document.getElementById("loginModal");
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    }

    await loadCategories();
    await loadProducts();

    alert("Login success ✅");
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  clearToken();
  updateAdminUI();
  alert("Logged out ✅");
}

// ------- Admin Categories -------
function renderAdminCategories() {
  const list = document.getElementById("adminCategoriesList");
  if (!list) return;

  if (!isLoggedIn()) {
    list.innerHTML = `<div class="text-muted small">Login as admin to manage categories.</div>`;
    return;
  }

  if (!allCategories.length) {
    list.innerHTML = `<div class="text-muted small">No categories</div>`;
    return;
  }

  list.innerHTML = allCategories
    .map(
      (c) => `
    <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
      <div>
        <div class="fw-semibold">${c.name}</div>
        <div class="small text-muted">${c._id}</div>
      </div>
      <button class="btn btn-sm btn-outline-danger" data-cat-del="${c._id}">
        Delete
      </button>
    </div>
  `
    )
    .join("");
}

async function adminAddCategory() {
  const name = document.getElementById("adminCategoryName")?.value.trim();
  const description = document.getElementById("adminCategoryDesc")?.value.trim();

  if (!name) {
    alert("Category name required");
    return;
  }

  try {
    await apiFetch(API_CATEGORIES, {
      method: "POST",
      body: JSON.stringify({ name, description })
    });

    document.getElementById("adminCategoryName").value = "";
    document.getElementById("adminCategoryDesc").value = "";

    await loadCategories();
    alert("Category created ✅");
  } catch (err) {
    alert(err.message);
  }
}

async function adminDeleteCategory(id) {
  if (!confirm("Delete category?")) return;

  try {
    await apiFetch(`${API_CATEGORIES}/${id}`, { method: "DELETE" });
    await loadCategories();
    await loadProducts(); // products might change populate category name
    alert("Category deleted ✅");
  } catch (err) {
    alert(err.message);
  }
}

// ------- Admin Products -------
function renderAdminProducts() {
  const list = document.getElementById("adminProductsList");
  if (!list) return;

  if (!isLoggedIn()) {
    list.innerHTML = `<div class="text-muted small">Login as admin to manage products.</div>`;
    return;
  }

  if (!allProducts.length) {
    list.innerHTML = `<div class="text-muted small">No products</div>`;
    return;
  }

  list.innerHTML = allProducts
    .map((p) => {
      const catName = p.categoryId?.name ? p.categoryId.name : "No category";
      return `
      <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
        <div>
          <div class="fw-semibold">${p.name} — ₸ ${p.price}</div>
          <div class="small text-muted">${catName}</div>
          <div class="small text-muted">${p._id}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger" data-prod-del="${p._id}">
          Delete
        </button>
      </div>
    `;
    })
    .join("");
}

async function adminAddProduct() {
  const name = document.getElementById("adminProductName")?.value.trim();
  const price = Number(document.getElementById("adminProductPrice")?.value);
  const description = document.getElementById("adminProductDesc")?.value.trim();
  const categoryId = document.getElementById("adminProductCategory")?.value || null;

  if (!name || Number.isNaN(price)) {
    alert("Product name and valid price required");
    return;
  }

  try {
    await apiFetch(API_PRODUCTS, {
      method: "POST",
      body: JSON.stringify({ name, price, description, categoryId })
    });

    document.getElementById("adminProductName").value = "";
    document.getElementById("adminProductPrice").value = "";
    document.getElementById("adminProductDesc").value = "";
    document.getElementById("adminProductCategory").value = "";

    await loadProducts();
    alert("Product created ✅");
  } catch (err) {
    alert(err.message);
  }
}

async function adminDeleteProduct(id) {
  if (!confirm("Delete product?")) return;

  try {
    await apiFetch(`${API_PRODUCTS}/${id}`, { method: "DELETE" });
    await loadProducts();
    alert("Product deleted ✅");
  } catch (err) {
    alert(err.message);
  }
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  renderCart();

  updateAdminUI();

  // Load catalog if present
  if (document.getElementById("catalogContainer")) {
    await loadCategories();
    await loadProducts();

    document.getElementById("categoryFilter")?.addEventListener("change", applyFilters);
    document.getElementById("priceMin")?.addEventListener("input", applyFilters);
    document.getElementById("priceMax")?.addEventListener("input", applyFilters);
  }

  // Add-to-cart click
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("add-to-cart")) return;

    const card = e.target.closest(".product-card");
    if (!card) return;

    addToCart({
      id: card.dataset.id,
      title: card.dataset.title,
      price: Number(card.dataset.price),
      img: card.dataset.img
    });
  });

  // Admin actions
  document.getElementById("btnLoginSubmit")?.addEventListener("click", handleLogin);
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);

  document.getElementById("btnAdminAddCategory")?.addEventListener("click", adminAddCategory);
  document.getElementById("btnAdminAddProduct")?.addEventListener("click", adminAddProduct);

  document.addEventListener("click", (e) => {
    const catId = e.target.getAttribute("data-cat-del");
    if (catId) adminDeleteCategory(catId);

    const prodId = e.target.getAttribute("data-prod-del");
    if (prodId) adminDeleteProduct(prodId);
  });
});