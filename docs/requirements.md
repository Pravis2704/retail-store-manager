# Requirements Specification: Retail Store Manager

## 1. Business Problem
Small and mid-sized retail stores frequently rely on manual book-keeping or disparate spreadsheets to track products, inventory counts, point-of-sale transactions, customer data, and supplier reordering. 

This causes severe operational bottlenecks:
- **Discrepant stock counts**: Manual adjustments lead to inventory drift.
- **Selling out-of-stock items**: Customers purchase products that are physically absent.
- **Delayed reordering**: Low-stock products go unnoticed until completely depleted.
- **Supplier friction**: Lack of historical supplier performance, contact tracking, and cost auditing.
- **Lack of audit trails**: Inventory shrinkage, damaged goods, or unaccounted losses cannot be traced.
- **Duplicate reorder requests**: Multiple staff members submit redundant purchase orders for the same deficit.
- **Disjointed reporting**: Business owners lack consolidated visibility into daily sales, top categories, and margins.

The **Retail Store Manager** centralizes all operations into a unified, process-driven MERN platform:
```
Product Catalog -> Supplier Network -> Real-Time Inventory -> Customer CRM -> Point of Sale (POS) -> Atomic Stock Deduction -> Low Stock Alerts -> Automated/Manual Reorder -> Managerial Approval -> Goods Receipt & Replenishment
```

---

## 2. Stakeholders & User Personas

| Role | Persona | Responsibilities & System Interactions |
|---|---|---|
| **ADMIN** | Store Owner / Operations Director | Full system control: Manage users/roles, manage suppliers, product catalog, inventory audits, reorder approvals, financial reports, system configuration. |
| **MANAGER** | Store / Shift Manager | Daily operations: Monitor inventory, review low stock, raise/approve reorders, receive goods from suppliers, manage customer accounts, view sales & shift reports. |
| **SALES_STAFF** | POS Cashier / Counter Associate | Front-desk sales: Fast product lookup, customer lookup/registration, cart management, discount application, multi-method tender processing, receipt viewing. Strictly restricted from altering inventory rules or approving reorders. |

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization
- **FR-AUTH-1**: User login with email and password returning JWT with role-based claims.
- **FR-AUTH-2**: Password encryption using bcrypt with minimum 10 salt rounds.
- **FR-AUTH-3**: Protected REST endpoints using Bearer token verification middleware.
- **FR-AUTH-4**: Role-Based Access Control (RBAC) middleware verifying user privileges (`ADMIN`, `MANAGER`, `SALES_STAFF`).
- **FR-AUTH-5**: User management (Admin only) to create, list, and toggle user active state.

### 3.2 Product Catalog & Supplier Management
- **FR-PROD-1**: Unique SKU enforcement per product.
- **FR-PROD-2**: Product attributes: SKU, Name, Category, Description, Cost Price, Selling Price, Unit, Reorder Level, Maximum Stock, Supplier reference, and Active status.
- **FR-PROD-3**: Validation: `sellingPrice >= 0`, `costPrice >= 0`, `reorderLevel >= 0`, `maximumStock > reorderLevel`.
- **FR-PROD-4**: Soft deactivation: Inactive products cannot be sold in POS or added to new reorders.
- **FR-SUPP-1**: Supplier attributes: Name, Contact Person, Phone, Email, Address, Status (`ACTIVE`, `INACTIVE`).
- **FR-SUPP-2**: Phone and email format validation.

### 3.3 Inventory & Stock Audit Ledger
- **FR-INV-1**: Real-time inventory tracking: `product`, `currentStock`, `reorderLevel`, `maximumStock`, `status`, `lastRestockedAt`.
- **FR-INV-2**: Automatic status computation:
  - `NORMAL`: `currentStock > reorderLevel`
  - `LOW_STOCK`: `0 < currentStock <= reorderLevel`
  - `OUT_OF_STOCK`: `currentStock == 0`
- **FR-INV-3**: Zero negative stock tolerance: System must reject transactions reducing stock below 0.
- **FR-INV-4**: Stock Transaction Audit Ledger for every inventory delta:
  - Transaction types: `PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`, `DAMAGE`.
  - Records: `product`, `quantity` (+/-), `previousStock`, `newStock`, `referenceId`, `referenceType`, `performedBy`, `notes`.

### 3.4 Customer Management
- **FR-CUST-1**: Customer attributes: Name, Phone (indexed), Email, Address, Total Purchases, Total Spent.
- **FR-CUST-2**: Quick customer creation directly from POS modal during checkout without breaking sale flow.
- **FR-CUST-3**: Instant search by phone or name.

### 3.5 Point of Sale (POS) & Sales Execution
- **FR-SALE-1**: Fast barcode/SKU/name product search with stock availability badge.
- **FR-SALE-2**: Cart management with real-time quantity controls, unit price, and line totals.
- **FR-SALE-3**: Server-side total calculation: Backend strictly recalculates item totals, subtotal, discount validation, and net payable. Frontend totals are never trusted.
- **FR-SALE-4**: Concurrency-safe atomic stock deduction: Deducts stock atomically and aborts if available stock is insufficient.
- **FR-SALE-5**: Multi-tender payment support: `CASH`, `CARD`, `UPI`.
- **FR-SALE-6**: Human-readable unique sale number generation (e.g., `SALE-20260925-0001`).
- **FR-SALE-7**: Automated post-sale low-stock evaluation: If stock reaches or falls below `reorderLevel`, automatically triggers a pending reorder request if none already exists.

### 3.6 Reorder & Replenishment Workflow
- **FR-REORD-1**: Auto or manual creation of Reorder Request.
- **FR-REORD-2**: Reorder formula: `recommendedQuantity = maximumStock - currentStock`.
- **FR-REORD-3**: Duplicate prevention: System prevents duplicate `PENDING` reorder requests for the same product.
- **FR-REORD-4**: Multi-stage approval:
  - Status progression: `PENDING` -> `APPROVED` | `REJECTED` -> `COMPLETED`.
  - Only `ADMIN` and `MANAGER` can approve/reject.
  - Rejection requires a mandatory reason.
- **FR-REORD-5**: Goods Receipt:
  - Validates `receivedQuantity > 0`.
  - Increments inventory `currentStock`.
  - Updates `lastRestockedAt` timestamp.
  - Generates a `PURCHASE` type stock transaction audit log.
  - Sets reorder status to `COMPLETED`.

### 3.7 Analytics, Dashboard & Reporting
- **FR-DASH-1**: High-level KPIs: Total Products, Today's Sales Count, Today's Revenue, Low Stock Count, Out of Stock Count, Pending Reorders Count, Total Customers.
- **FR-DASH-2**: Visual trend charts: Sales over time (last 7/30 days), Top-selling products by quantity & revenue, Category distribution, Inventory health breakdown.
- **FR-DASH-3**: Actionable alerts: Prominent visual banners for critical low stock items and pending approvals.
- **FR-REP-1**: Filterable Sales Report (Daily, Weekly, Monthly, Custom Range) with export/print capability.
- **FR-REP-2**: Inventory Valuation & Stock Status Report.
- **FR-REP-3**: Stock Movement Audit Trail Report.
- **FR-REP-4**: Supplier & Reorder Performance Report.

---

## 4. Non-Functional Requirements

- **NFR-SEC-1**: Authentication tokens use JWT with 24h expiration; secrets kept in environment variables.
- **NFR-SEC-2**: Passwords salted and hashed with bcrypt.
- **NFR-SEC-3**: Input sanitization and Mongoose schema constraints to guard against injection.
- **NFR-PERF-1**: Database queries indexed on lookup keys (`sku`, `email`, `phone`, `saleNumber`, `requestNumber`, `status`).
- **NFR-PERF-2**: Sub-second API response time for POS cart and checkout operations.
- **NFR-DATA-1**: Atomic operations / session transactions ensure data integrity across multi-collection operations (Sale + Inventory + Audit Log + Reorder).
- **NFR-UX-1**: Intuitive POS and management interface built with Tailwind CSS, supporting desktop and tablet viewports.
- **NFR-UX-2**: Responsive feedback with toast notifications, loading spinners, and explicit confirmation modals.

---

## 5. Business Rules Matrix

| Rule ID | Rule Description | Enforcement Layer | Action on Breach |
|---|---|---|---|
| **BR-01** | Selling price and cost price must be non-negative. | Backend Validator & Model | Return 400 Bad Request |
| **BR-02** | Maximum stock must strictly exceed reorder level. | Backend Validator & Model | Return 400 Bad Request |
| **BR-03** | Deactivated products cannot be sold in POS. | POS Service | Return 400 Bad Request: "Product is inactive" |
| **BR-04** | Inventory cannot drop below zero (`currentStock >= 0`). | Inventory Service / DB filter | Return 400 Bad Request: "Insufficient stock" |
| **BR-05** | Frontend prices/totals are ignored; backend recalculates. | Sales Service | Server recalculates; rejects on mismatch/tampering |
| **BR-06** | Only one active `PENDING` reorder per product at a time. | Reorder Service | Return 409 Conflict: "Pending reorder already exists" |
| **BR-07** | Sales staff cannot approve reorders or edit inventory rules. | RBAC Middleware | Return 403 Forbidden |
| **BR-08** | Inactive suppliers cannot be assigned new reorders. | Reorder Service | Return 400 Bad Request: "Supplier inactive" |
| **BR-09** | Rejection of reorder requires a non-empty reason. | Reorder Service | Return 400 Bad Request: "Reason required" |
| **BR-10** | Goods receipt quantity must be greater than zero. | Reorder Service | Return 400 Bad Request: "Invalid quantity" |

---

## 6. Assumptions & Edge Cases

### Assumptions
1. Single retail store deployment with local currency (INR - ₹ / standard currency unit).
2. Direct cashier tender: immediate payment capture via Cash, UPI, or Card at POS.
3. System runs locally or on cloud instance with MongoDB 6.0+.

### Edge Cases Handled
1. **Concurrent sales for last unit of stock**: Atomic conditional check-and-decrement ensures only the first sale succeeds; second receives a 400 with "Insufficient stock available: 0".
2. **Partial stock shortage**: Clear error messaging indicating exact available units.
3. **Empty cart checkout**: Blocked both client-side and server-side.
4. **Discount exceeding subtotal**: Discount clamped or rejected with 400 Bad Request.
5. **Product deletion with sales history**: Hard deletes blocked; soft-deactivation applied.
6. **Network drop during checkout**: Atomic operations prevent orphaned sale items or unrecorded stock decrements.
