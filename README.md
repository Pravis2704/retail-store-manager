# Retail Store Manager — MERN Full-Stack Application

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6+-brightgreen.svg)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-cyan.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

A production-quality, process-driven **Retail Store Manager** full-stack application engineered for small and mid-sized retail enterprises. 

Unlike disjointed CRUD tools, this application models the complete closed-loop retail business workflow: from product registration and supplier management to Point-of-Sale (POS) atomic checkout, real-time stock ledger tracking, automated low-stock detection, purchase order requisition, managerial approval, and inventory replenishment.

---

## 1. Core Business Workflow

```
Product & Supplier Onboarding
       ↓
Initial Stock & Inventory Level Configuration
       ↓
Point of Sale (POS) Customer Checkout
       ↓
Concurrency-Safe Atomic Stock Deduction
       ↓
Immutable Stock Transaction Audit Logging
       ↓
Real-Time Stock Level Evaluation
       ↓
Automated / Manual Low-Stock Reorder Generation
       ↓
Manager / Admin Review & Approval
       ↓
Inward Goods Delivery & Verification
       ↓
Inventory Replenishment & Status Re-calculation
       ↓
Real-Time Dashboard & Financial Reporting Updates
```

---

## 2. Key Features

- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: Full administrative control over users, suppliers, products, inventory audits, approvals, and reporting.
  - `MANAGER`: Daily store operations, low-stock review, reorder approval, goods receipt, customer accounts, and shift reports.
  - `SALES_STAFF`: High-speed POS interface, customer creation/lookup, cart processing, receipt generation. Strictly prevented from approving reorders or changing stock policies.
- **High-Speed Point of Sale (POS)**:
  - Instant barcode / SKU / product name search.
  - Quick customer registration without leaving the checkout flow.
  - Multi-tender payment capture: Cash, Card, UPI.
  - Tamper-proof totals: Server strictly recalculates prices, taxes, discounts, and item subtotals.
- **Inventory Ledger & Concurrency Safety**:
  - Atomic stock deductions ensure inventory never drops below zero even under concurrent checkouts.
  - Full audit trail logging every stock delta (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`, `DAMAGE`).
  - Dynamic stock health computation (`NORMAL`, `LOW_STOCK`, `OUT_OF_STOCK`).
- **Closed-Loop Reorder System**:
  - Automatic requisition trigger when stock reaches reorder threshold.
  - Formula: $\text{Recommended Quantity} = \text{Maximum Stock} - \text{Current Stock}$.
  - Duplicate reorder prevention blocks redundant pending orders for the same product.
  - Goods receipt verification that instantly replenishes active stock and logs purchase transactions.
- **Analytics & Reporting Dashboard**:
  - Live store KPIs: Today's Sales Count, Gross Revenue, Low-Stock Alerts, Pending Reorders.
  - Charts: Sales trends over time, category-wise revenue distribution, top-selling products.
  - Exportable/printable reports for Sales, Inventory valuation, Stock movements, and Reorders.

---

## 3. Technology Stack

- **Frontend**:
  - React 18 & Vite
  - Tailwind CSS & Lucide React Icons
  - React Router DOM v6
  - Axios for API communication
  - Context API for lightweight global authentication and notification state
- **Backend**:
  - Node.js & Express.js RESTful API
  - MongoDB & Mongoose ODM
  - JWT (JSON Web Tokens) for stateless authentication
  - Bcrypt.js for one-way password hashing
  - CORS, Morgan logging, and centralized error handling
- **Testing**:
  - Automated API test scripts verifying RBAC, sales transactions, stock constraints, and reorder lifecycles.

---

## 4. Architecture & Directory Structure

```
ANTI/
├── backend/
│   ├── src/
│   │   ├── config/         # MongoDB connection & environment config
│   │   ├── controllers/    # Request/Response orchestration
│   │   ├── middleware/     # Auth verification, RBAC, error handling
│   │   ├── models/         # Mongoose schemas (User, Product, Inventory, Sale, etc.)
│   │   ├── routes/         # REST API route declarations
│   │   ├── services/       # Core business logic & database mutations
│   │   ├── utils/          # ID generators, response helpers
│   │   ├── seed/           # Demo database seeder script
│   │   └── server.js       # Express application entrypoint
│   ├── tests/              # Automated backend integration tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/         # Branding and static icons
│   │   ├── components/     # UI primitives (DataTable, Modal, Badge, Navbar)
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── layouts/        # AppLayout with responsive sidebar & topnav
│   │   ├── pages/          # POS, Products, Inventory, Reorders, Reports, Dashboard
│   │   ├── services/       # Axios API client functions
│   │   └── App.jsx         # Application routing & role guards
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── docs/                   # Full engineering documentation
│   ├── requirements.md     # Stakeholder specs & business rules
│   ├── business-process.md # Detailed process flow & state transitions
│   ├── database-design.md  # Schema definitions, ERD, and indexes
│   ├── test-cases.md       # Traceability matrix & test plan
│   └── ai-development-log.md # Development decisions, prompts & rationale
└── README.md
```

---

## 5. Demo Credentials

The database seeder pre-populates three accounts for end-to-end role testing:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Admin** | `admin@retail.com` | `Admin@123` | Full access: Users, catalog, inventory, reorders, reports |
| **Manager** | `manager@retail.com` | `Manager@123` | Store management, approvals, goods receipt, reports |
| **Sales Staff** | `staff@retail.com` | `Staff@123` | POS checkout, customer creation, viewing inventory stock |

---

## 6. Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher
- **MongoDB**: v6.0+ running locally on `mongodb://127.0.0.1:27017` (or MongoDB Atlas URI)

### Step 1: Clone & Environment Setup
Clone the repository and inspect the project root.

#### Backend Environment Setup:
Navigate to `backend/` and verify `.env` (a ready `.env.example` is provided):
```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/retail_store_db
JWT_SECRET=super_secret_jwt_retail_store_key_2026_xyz
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Seed Database
Populate the database with realistic demo data (users, categories, suppliers, products, initial inventory, low-stock items, sample sales, and pending reorders):
```bash
cd backend
npm run seed
```

### Step 4: Run Application
Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

Access the application in your browser at `http://localhost:5173`.

---

## 7. Automated Backend Testing

Run the integration test suite to verify authentication, stock validation, negative inventory prevention, POS order calculations, and the reorder approval lifecycle:
```bash
cd backend
npm test
```

---

## 8. Guided Campus Assessment Walkthrough Scenario

To demonstrate the full business process during evaluation:
1. **Login as Admin** (`admin@retail.com` / `Admin@123`).
   - View Dashboard KPIs and alerts.
   - Go to **Suppliers** and verify existing suppliers or add a new one.
   - Go to **Products** and view products with configured reorder levels and maximum stock.
2. **Login as Sales Staff** (`staff@retail.com` / `Staff@123`).
   - Open **POS Terminal**.
   - Select or create a customer.
   - Search for a product nearing its reorder threshold (e.g. `RICE-5KG`).
   - Complete the sale.
   - Note how current stock is atomically deducted in real time.
   - Because stock dropped below reorder level, a **Reorder Request** is automatically triggered!
3. **Login as Manager** (`manager@retail.com` / `Manager@123`).
   - Navigate to **Reorders**.
   - Inspect the newly generated `PENDING` reorder with pre-calculated recommended quantity.
   - Click **Approve**.
   - Once shipment is marked as received, click **Receive Goods** and enter the verified quantity.
   - Inventory immediately replenishes, status updates to `NORMAL`, and an audit transaction is logged.
4. **Inspect Reports & Dashboard**.
   - Check the **Stock Movement Report** to see the immutable audit trail (`PURCHASE` and `SALE` logs).
   - Check the **Sales Report** to verify today's revenue.

---

## 9. Deployment

### Frontend — Vercel
1. Import the repo on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. **Framework Preset**: Vite.
4. **Build Command**: `npm run build` | **Output Directory**: `dist`.
5. Add environment variable:
   - `VITE_API_URL` = `https://your-render-app.onrender.com/api`

### Backend — Render
1. Create a **Web Service** on [Render](https://render.com) and connect this repo.
2. Set **Root Directory** to `backend`.
3. **Build Command**: `npm install` | **Start Command**: `npm start`.
4. Add environment variables (see `backend/.env.example`):
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — strong secret key
   - `JWT_EXPIRES_IN` — `24h`
   - `CLIENT_URL` — your Vercel frontend URL (e.g., `https://retail-store-manager.vercel.app`)
   - `NODE_ENV` — `production`
