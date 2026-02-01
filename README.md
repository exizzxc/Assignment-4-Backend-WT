# Assignment 4 — MVC + JWT + RBAC (Node.js / Express / MongoDB)

This project is an upgraded version of Assignment 3.
It implements a clean MVC architecture, secure authentication, and Role-Based Access Control (RBAC) using JWT.

## Features
    - MVC architecture (models/routes/controllers/middleware)
    - MongoDB + Mongoose
    - Two related objects with full CRUD:
      - Primary object: **Product**
      - Secondary object: **Category**
    - Authentication:
      - User registration & login
      - Password hashing with **bcrypt**
      - JWT token authorization
    - RBAC:
      - **GET** routes are public
      - **POST/PUT/DELETE** routes are restricted to **admin only**
    - Simple admin dashboard:
      - `/admin.html` for testing CRUD from UI

---

## 📁 Project Structure (MVC)
    server/
    src/
    app.js
    models/
    Product.js
    Category.js
    User.js
    controllers/
    productsController.js
    categoriesController.js
    authController.js
    routes/
    products.js
    categories.js
    auth.js
    middleware/
    auth.js
    requireAdmin.js
    errorHandler.js
    public/
    index.html   (website)
    admin.html   (admin panel)
    admin.js

---

## 🧩 Objects

### 1) Category (Secondary object)
Fields:
- `name` (string, required, unique)
- `description` (string, optional)

CRUD endpoints:
- GET `/api/categories`
- GET `/api/categories/:id`
- POST `/api/categories` (admin)
- PUT `/api/categories/:id` (admin)
- DELETE `/api/categories/:id` (admin)

---

### 2) Product (Primary object)
Fields:
- `name` (string, required)
- `price` (number, required)
- `description` (string, optional)
- `categoryId` (ObjectId, reference to Category)

CRUD endpoints:
- GET `/api/products`
- GET `/api/products/:id`
- POST `/api/products` (admin)
- PUT `/api/products/:id` (admin)
- DELETE `/api/products/:id` (admin)

---

## Authentication & RBAC

### User model
- `email`
- `password` (stored as bcrypt hash)
- `role` (`user` or `admin`)

### JWT
    Login returns a token:
    Authorization: Bearer

### RBAC rules
    - Public access:
      - GET routes are open for everyone
    - Admin-only access:
      - POST/PUT/DELETE routes require:
        1) valid JWT token
        2) user role = admin

---

##  Setup & Run

### 1) Install dependencies
    ```bash
    cd server
    npm install

### 2) Create .env
    Create file server/.env:
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_secret_key
    JWT_EXPIRES_IN=7d

### 3) Run server
    node src/app.js

    Server runs on: 	http://localhost:3000

## Frontend
	Main website:
	http://localhost:3000/
	Admin panel for CRUD:
	http://localhost:3000/admin.html
