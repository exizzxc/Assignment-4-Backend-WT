const API = "/api";
const TOKEN_KEY = "token";

// ---------------- helpers ----------------
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showStatus(message, type = "success") {
  const box = document.getElementById("statusBox");
  box.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning");
  if (type === "error") box.classList.add("alert-danger");
  else if (type === "warn") box.classList.add("alert-warning");
  else box.classList.add("alert-success");

  box.textContent = message;
  setTimeout(() => box.classList.add("d-none"), 3500);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

// ---------------- state ----------------
let categories = [];
let products = [];

let editingCategoryId = null;
let editingProductId = null;

// ---------------- auth UI ----------------
function updateAuthUI() {
  const badge = document.getElementById("authBadge");
  const btnLogout = document.getElementById("btnLogout");
  const logged = !!getToken();

  badge.textContent = logged ? "Logged in ✅" : "Not logged in";
  btnLogout.classList.toggle("d-none", !logged);

  // disable admin buttons if not logged
  document.getElementById("btnAddCategory").disabled = !logged;
  document.getElementById("btnUpdateCategory").disabled = !logged;

  document.getElementById("btnAddProduct").disabled = !logged;
  document.getElementById("btnUpdateProduct").disabled = !logged;
}

// ---------------- render ----------------
function renderCategoryDropdowns() {
  const createSel = document.getElementById("prodCategory");
  const editSel = document.getElementById("editProdCategory");

  const options =
    `<option value="">No category</option>` +
    categories.map((c) => `<option value="${c._id}">${c.name}</option>`).join("");

  createSel.innerHTML = options;
  editSel.innerHTML = options;

  // restore edit selection if editing
  if (editingProductId) {
    const prod = products.find((p) => p._id === editingProductId);
    if (prod) {
      const cid = prod.categoryId?._id || prod.categoryId || "";
      editSel.value = cid || "";
    }
  }
}

function renderCategories() {
  const root = document.getElementById("categoriesList");

  if (!categories.length) {
    root.innerHTML = `<div class="text-muted small">No categories</div>`;
    return;
  }

  root.innerHTML = categories
    .map(
      (c) => `
    <div class="border rounded p-2 mb-2 d-flex justify-content-between gap-2">
      <div>
        <div class="fw-semibold">${c.name}</div>
        <div class="small text-muted">${c.description || ""}</div>
        <div class="small text-muted"><b>ID:</b> ${c._id}</div>
      </div>

      <div class="d-flex flex-column gap-2">
        <button class="btn btn-outline-primary btn-sm" data-cat-edit="${c._id}">
          Edit
        </button>
        <button class="btn btn-outline-danger btn-sm" data-cat-del="${c._id}" ${getToken() ? "" : "disabled"}>
          Delete
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

function renderProducts() {
  const root = document.getElementById("productsList");

  if (!products.length) {
    root.innerHTML = `<div class="text-muted small">No products</div>`;
    return;
  }

  root.innerHTML = products
    .map((p) => {
      const catName = p.categoryId?.name ? p.categoryId.name : "No category";
      return `
      <div class="border rounded p-2 mb-2 d-flex justify-content-between gap-2">
        <div>
          <div class="fw-semibold">${p.name} — ₸ ${p.price}</div>
          <div class="small text-muted">${p.description || ""}</div>
          <div class="small text-muted">${catName}</div>
          <div class="small text-muted"><b>ID:</b> ${p._id}</div>
        </div>

        <div class="d-flex flex-column gap-2">
          <button class="btn btn-outline-primary btn-sm" data-prod-edit="${p._id}">
            Edit
          </button>
          <button class="btn btn-outline-danger btn-sm" data-prod-del="${p._id}" ${getToken() ? "" : "disabled"}>
            Delete
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

function clearCategoryEditForm() {
  editingCategoryId = null;
  document.getElementById("editCatId").value = "";
  document.getElementById("editCatName").value = "";
  document.getElementById("editCatDesc").value = "";
}

function clearProductEditForm() {
  editingProductId = null;
  document.getElementById("editProdId").value = "";
  document.getElementById("editProdName").value = "";
  document.getElementById("editProdPrice").value = "";
  document.getElementById("editProdDesc").value = "";
  document.getElementById("editProdCategory").value = "";
}

// ---------------- API ----------------
async function refreshCategories() {
  categories = await apiFetch("/categories", { method: "GET" });
  renderCategories();
  renderCategoryDropdowns();
}

async function refreshProducts() {
  products = await apiFetch("/products", { method: "GET" });
  renderProducts();
}

async function refreshAll() {
  await refreshCategories();
  await refreshProducts();
}

// ---------------- auth actions ----------------
async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) return showStatus("Email & password required", "error");

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    setToken(data.token);
    updateAuthUI();
    await refreshAll();
    showStatus("Login success");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

function logout() {
  clearToken();
  updateAuthUI();
  clearCategoryEditForm();
  clearProductEditForm();
  showStatus("Logged out ✅");
}

// ---------------- CRUD: categories ----------------
async function addCategory() {
  const name = document.getElementById("catName").value.trim();
  const description = document.getElementById("catDesc").value.trim();

  if (!name) return showStatus("Category name required", "error");

  try {
    await apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify({ name, description })
    });

    document.getElementById("catName").value = "";
    document.getElementById("catDesc").value = "";

    await refreshCategories();
    showStatus("Category created");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

async function deleteCategory(id) {
  if (!confirm("Delete category?")) return;

  try {
    await apiFetch(`/categories/${id}`, { method: "DELETE" });
    await refreshAll();
    showStatus("Category deleted");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

function startEditCategory(id) {
  const cat = categories.find((c) => c._id === id);
  if (!cat) return;

  editingCategoryId = id;

  document.getElementById("editCatId").value = cat._id;
  document.getElementById("editCatName").value = cat.name || "";
  document.getElementById("editCatDesc").value = cat.description || "";

  showStatus("Edit mode: category loaded", "warn");
}

async function updateCategory() {
  if (!editingCategoryId) return showStatus("Select category to edit first", "error");

  const name = document.getElementById("editCatName").value.trim();
  const description = document.getElementById("editCatDesc").value.trim();

  if (!name) return showStatus("New name is required", "error");

  try {
    await apiFetch(`/categories/${editingCategoryId}`, {
      method: "PUT",
      body: JSON.stringify({ name, description })
    });

    clearCategoryEditForm();
    await refreshAll();
    showStatus("Category updated");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

// ---------------- CRUD: products ----------------
async function addProduct() {
  const name = document.getElementById("prodName").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const description = document.getElementById("prodDesc").value.trim();
  const categoryId = document.getElementById("prodCategory").value || null;

  if (!name || Number.isNaN(price)) {
    return showStatus("Product name and valid price required", "error");
  }

  try {
    await apiFetch("/products", {
      method: "POST",
      body: JSON.stringify({ name, price, description, categoryId })
    });

    document.getElementById("prodName").value = "";
    document.getElementById("prodPrice").value = "";
    document.getElementById("prodDesc").value = "";
    document.getElementById("prodCategory").value = "";

    await refreshProducts();
    showStatus("Product created");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete product?")) return;

  try {
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    await refreshProducts();
    showStatus("Product deleted");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

function startEditProduct(id) {
  const p = products.find((x) => x._id === id);
  if (!p) return;

  editingProductId = id;

  document.getElementById("editProdId").value = p._id;
  document.getElementById("editProdName").value = p.name || "";
  document.getElementById("editProdPrice").value = p.price ?? "";
  document.getElementById("editProdDesc").value = p.description || "";

  const cid = p.categoryId?._id || p.categoryId || "";
  document.getElementById("editProdCategory").value = cid || "";

  showStatus("Edit mode: product loaded", "warn");
}

async function updateProduct() {
  if (!editingProductId) return showStatus("Select product to edit first", "error");

  const name = document.getElementById("editProdName").value.trim();
  const price = Number(document.getElementById("editProdPrice").value);
  const description = document.getElementById("editProdDesc").value.trim();
  const categoryId = document.getElementById("editProdCategory").value || null;

  if (!name || Number.isNaN(price)) {
    return showStatus("New name and valid price required", "error");
  }

  try {
    await apiFetch(`/products/${editingProductId}`, {
      method: "PUT",
      body: JSON.stringify({ name, price, description, categoryId })
    });

    clearProductEditForm();
    await refreshProducts();
    showStatus("Product updated");
  } catch (err) {
    showStatus(err.message, "error");
  }
}

// ---------------- events ----------------
document.addEventListener("DOMContentLoaded", async () => {
  updateAuthUI();

  document.getElementById("btnLogin").addEventListener("click", login);
  document.getElementById("btnLogout").addEventListener("click", logout);

  document.getElementById("btnAddCategory").addEventListener("click", addCategory);
  document.getElementById("btnUpdateCategory").addEventListener("click", updateCategory);
  document.getElementById("btnCancelEditCategory").addEventListener("click", () => {
    clearCategoryEditForm();
    showStatus("Edit cancelled", "warn");
  });

  document.getElementById("btnAddProduct").addEventListener("click", addProduct);
  document.getElementById("btnUpdateProduct").addEventListener("click", updateProduct);
  document.getElementById("btnCancelEditProduct").addEventListener("click", () => {
    clearProductEditForm();
    showStatus("Edit cancelled", "warn");
  });

  document.getElementById("btnRefreshCategories").addEventListener("click", refreshCategories);
  document.getElementById("btnRefreshProducts").addEventListener("click", refreshProducts);

  document.addEventListener("click", (e) => {
    const catDel = e.target.getAttribute("data-cat-del");
    if (catDel) deleteCategory(catDel);

    const catEdit = e.target.getAttribute("data-cat-edit");
    if (catEdit) startEditCategory(catEdit);

    const prodDel = e.target.getAttribute("data-prod-del");
    if (prodDel) deleteProduct(prodDel);

    const prodEdit = e.target.getAttribute("data-prod-edit");
    if (prodEdit) startEditProduct(prodEdit);
  });

  // initial load (GET is public)
  try {
    await refreshAll();
  } catch (err) {
    showStatus(err.message, "error");
  }
});