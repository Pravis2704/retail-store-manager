# AI-Assisted Engineering Journal & Technical Evaluation Log

This document records the design decisions, prompts, modifications, validation, debugging resolutions, and lessons learned during the AI-assisted development of the **Retail Store Manager** MERN application.

It is structured to satisfy both the **Understand → Analyse → Design → Build → Test → Explain** evaluation criteria and the specific interview questions outlined in Section 43 of the project specification.

---

## 1. AI Development Entries by Engineering Stage

### Entry 1: Problem Definition & Domain Workflow Modeling
- **Stage**: Understand & Analyse
- **Prompt**:
  > *"Act as a Senior Full-Stack Software Engineer, Business Analyst, and Database Architect. Analyze the problem of spreadsheet-based inventory management in retail stores. Design a unified, closed-loop business workflow connecting Products, Suppliers, Customers, POS Checkout, Inventory Ledgers, Low-Stock Detection, Reorders, and Approvals rather than disconnected CRUD tables."*
- **AI Approach**:
  - Outlined the retail life-cycle: Catalog -> Supplier -> Inventory -> POS Sale -> Atomic Decrement -> Audit Ledger -> Low-Stock Trigger -> Reorder Requisition -> Manager Approval -> Inward Goods Receipt -> Inventory Replenishment -> Analytics.
  - Specified 3 distinct roles: `ADMIN`, `MANAGER`, and `SALES_STAFF`.
- **What Was Accepted**:
  - The unified closed-loop operational flow.
  - Strict rule that Sales Staff can create sales and register customers, but can never alter inventory levels or approve purchase reorders.
- **What Was Modified**:
  - Formulated explicit human-readable identifier generators for invoices (`SALE-YYYYMMDD-XXXX`) and purchase requisitions (`ORD-YYYYMMDD-XXXX`).
- **Why It Was Modified**:
  - In real-world retail operations, cashier receipts and supplier delivery slips require memorable, human-searchable reference codes rather than 24-character hex ObjectIds.
- **Final Result**:
  - `docs/requirements.md` and `docs/business-process.md` established as technical baselines.
- **What I Learned**:
  - Business workflows must be closed-loop: an outward stock mutation (sale) should trigger replenishment signals without manual human polling.

---

### Entry 2: Database Schema & Entity Relationship Design
- **Stage**: Database Architecture
- **Prompt**:
  > *"Design the MongoDB schema using Mongoose for User, Product, Supplier, Customer, Inventory, Sale, SaleItem, StockTransaction, and ReorderRequest. Implement proper indexing, referential integrity, and business constraints (e.g. no negative stock, unique SKU, selling price >= 0, maximum stock > reorder level)."*
- **AI Approach**:
  - Separated `Inventory` into its own collection from `Product` (master catalog) to isolate fast-changing stock counters from product metadata.
  - Modeled `StockTransaction` as an immutable append-only ledger for all physical stock movements.
- **What Was Accepted**:
  - Normalization strategy with Mongoose references (`ref`).
  - Validation hooks and custom validators for threshold consistency (`maximumStock > reorderLevel`).
- **What Was Modified**:
  - Added snapshot values of `reorderLevel` and `maximumStock` in the `ReorderRequest` document.
  - Removed duplicate index definitions where fields had both `unique: true` in field declaration and `schema.index(...)`.
- **Why It Was Modified**:
  - Auditing integrity requires that a purchase requisition reflects the exact stock state and thresholds at the instant it was raised, even if an admin later reconfigures product catalog thresholds.
  - Removing duplicate index declarations eliminates Mongoose startup warnings and optimizes MongoDB index storage.
- **Final Result**:
  - `docs/database-design.md` with complete Entity-Relationship Diagram (ERD).
- **What I Learned**:
  - Master data (products) and operational state (inventory & audit logs) must have separated lifecycles to prevent contention during concurrent point-of-sale checkout.

---

### Entry 3: Point-of-Sale Engine & Concurrency-Safe Stock Deduction
- **Stage**: Backend Implementation & Reliability
- **Prompt**:
  > *"Implement the POS sales checkout engine in salesService.js. Enforce critical business rules: server-side total recalculation (never trust frontend prices), zero negative stock tolerance, atomic stock decrement, automatic low-stock reorder generation, duplicate pending reorder prevention, and customer purchase aggregation."*
- **AI Approach**:
  - Implemented transactional check-and-decrement logic using conditional MongoDB operations:
    `Inventory.findOneAndUpdate({ _id: invId, currentStock: { $gte: requestedQty } }, { $inc: { currentStock: -requestedQty } })`.
  - Added rollback compensation if a multi-item cart encounters a stockout on any subsequent line item.
- **What Was Accepted**:
  - Concurrency-safe atomic check-and-decrement.
  - Automatic status recomputation (`NORMAL`, `LOW_STOCK`, `OUT_OF_STOCK`).
  - Automatic generation of `PENDING` ReorderRequest when stock reaches reorderLevel.
- **What Was Modified**:
  - Disregarded any client-submitted `unitPrice` or `totalAmount`; backend queries the latest catalog selling price from MongoDB to prevent client price tampering.
- **Why It Was Modified**:
  - Security principle: Any client-side price or total can be intercepted or manipulated via DevTools or cURL. The server must be the single source of truth for pricing.
- **Final Result**:
  - Tested and verified under `TC-SALE-01` through `TC-SALE-06`.
- **What I Learned**:
  - Atomic document conditional updates in MongoDB guarantee that two cashiers attempting to sell the final unit of stock simultaneously cannot cause negative inventory.

---

### Entry 4: Debugging & Syntax Resolution
- **Stage**: Build & Quality Assurance
- **Prompt & Symptom**:
  - During `npm run build` of the frontend, Vite/esbuild failed with:
    `ERROR: Expected "}" but found "Time" at ReordersPage.jsx:437:86`.
- **Root Cause Analysis**:
  - A descriptive paragraph contained LaTeX math notation `$\text{ADS} \times \text{Lead Time} + \text{Safety Buffer}$`. In JSX, curly braces `{...}` denote JavaScript expressions; esbuild interpreted `{Lead Time}` as unquoted JS tokens rather than literal text.
- **What Was Modified**:
  - Replaced the unescaped formula with clear standard text: `(Daily Consumption × Supplier Lead Time) + Safety Buffer`.
- **Why It Was Modified**:
  - Prevents JSX parsing errors while remaining completely clear and readable to the user and evaluator.
- **Final Result**:
  - Frontend compiled cleanly with zero errors in `4.20s`.
- **What I Learned**:
  - AI code generators often insert raw markdown math syntax into JSX components; always run a production build verification step (`npm run build`) to catch transpilation quirks before deployment.

---

### Entry 5: Optional AI Feature — Smart Reorder Recommendation Engine
- **Stage**: Advanced Feature Engineering
- **Prompt**:
  > *"Implement Section 38: Smart Reorder Recommendation Engine. Use 30-day sales history velocity, supplier lead time, and safety buffer thresholds to calculate dynamic replenishment quantities without replacing foundational inventory rules."*
- **AI Approach**:
  - Developed `getSmartReorderRecommendations` using MongoDB aggregation on `SaleItem` to calculate:
    - $\text{Average Daily Sales (ADS)} = \frac{\text{Past 30 Days Sold Units}}{30}$
    - Lead time by category (2 to 5 days)
    - $\text{Safety Stock Buffer} = \max(2, \lceil \text{ADS} \times 3 \rceil)$
    - Projected days to stockout: $\frac{\text{Current Stock}}{\text{ADS}}$
    - Urgency classification (`CRITICAL`, `HIGH`, `NORMAL`)
    - Plain-English AI rationale explaining why the reorder is recommended.
- **What Was Accepted**:
  - Full mathematical model and explainable cards UI in the Reorders management view.
- **What Was Modified**:
  - Capped recommended quantity against `maximumStock - currentStock` so dynamic recommendations never cause warehouse overflow.
- **Why It Was Modified**:
  - Section 38 explicitly states: *"The AI feature must not replace the fundamental inventory business rules."*
- **Final Result**:
  - Implemented on backend (`GET /api/reorders/ai-recommendations`), added to automated test suite (`TC-AI-01`), and integrated into `ReordersPage.jsx`.

---

## 2. Comprehensive Interview & Viva Preparation Guide

When defending this project in the campus hiring assessment, refer to these answers:

### Business Domain Questions
1. **What problem does the application solve?**
   - Traditional retail operations suffer from spreadsheet drift: stock counts get out of sync, items sell out without cashiers knowing, reorders are delayed, and duplicate purchase orders are raised. This system provides a single centralized, closed-loop platform from product onboarding and supplier management to POS sales, real-time stock deduction, low-stock alerts, managerial approvals, and goods receipt replenishment.
2. **Who are the stakeholders?**
   - `ADMIN` (Store Owner): Master catalog, user provisioning, supplier agreements, financial and valuation audits.
   - `MANAGER` (Shift Lead): Stock audit adjustments, reorder reviews and approvals, physical goods receipt inward verification.
   - `SALES_STAFF` (Cashier): POS barcode/name lookup, cart checkout, multi-tender payment capture, instant customer registration.
3. **What is the primary business workflow?**
   - Product Created $\rightarrow$ Stock Initialized $\rightarrow$ POS Customer Checkout $\rightarrow$ Concurrency-Safe Stock Decrement $\rightarrow$ Audit Transaction Logged $\rightarrow$ Stock Reaches Reorder Level $\rightarrow$ Reorder Request Auto-Raised $\rightarrow$ Manager Approves Reorder $\rightarrow$ Shipment Received $\rightarrow$ Inventory Replenished $\rightarrow$ Status Resets to Normal $\rightarrow$ Real-Time KPIs Updated.
4. **What edge cases are handled?**
   - Zero stock / Out of stock item checkout rejection.
   - Partial stock shortages (clear feedback indicating available units).
   - Price tampering attempts (server strictly uses DB prices).
   - Duplicate pending reorders prevented with 409 Conflict.
   - Deactivated products blocked from POS cart.
   - Reorder rejection requires a mandatory justification reason.
   - Physical goods receipt rejects negative or zero quantities.

---

### Technical Architecture Questions
1. **Why MERN?**
   - End-to-end JavaScript enables shared domain modeling (JSON schemas, timestamps, ID formats) between client and server, eliminates serialization overhead, and allows rapid full-stack iteration.
2. **Why MongoDB?**
   - Retail data models benefit from document embedding (e.g. Sales with embedded item summaries) alongside relational references (`ObjectId`). MongoDB document-level atomic operators (`$inc`, `$set`, `$gte`) provide concurrency safety without heavy table locking.
3. **Why REST APIs?**
   - Predictable, stateless HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`) make the backend modular, cache-friendly, easily testable via Postman/automated suites, and decoupled from frontend presentation.
4. **How do Authentication and Authorization work?**
   - **Authentication**: Stateless JSON Web Tokens (JWT). Passwords hashed using bcrypt (10 rounds). Tokens verified via `protect` middleware extracting `Bearer <token>`.
   - **Authorization**: `authorize(...roles)` middleware inspects `req.user.role` from the verified token and rejects unauthorized actions with HTTP 403 Forbidden.
5. **How are concurrent sales handled to prevent negative inventory?**
   - Using conditional atomic database queries:
     `Inventory.findOneAndUpdate({ _id: id, currentStock: { $gte: requestedQty } }, { $inc: { currentStock: -requestedQty } })`.
     If two cashiers checkout the last remaining unit simultaneously, only one query matches `{ currentStock: { $gte: 1 } }`; the second query matches zero documents and safely returns HTTP 400 Insufficient Stock without corrupting state.
6. **How are errors centralized?**
   - An Express global error middleware catches Mongoose `ValidationError`, `CastError` (bad ID), duplicate keys (`code 11000`), and JWT errors, returning a standardized JSON schema:
     `{ success: false, message: string, errorCode: string }`.

---

### AI-Assisted Engineering Questions
1. **Which AI tools were used?**
   - DeepMind Antigravity AI coding assistant.
2. **What was AI's role vs human engineering?**
   - AI generated boilerplates, schema skeletons, and initial service methods. Human review verified business logic constraints, introduced human-readable ID generators, corrected JSX syntax issues, and enforced security boundaries (e.g. server-side price recalculation).
3. **How was AI-generated code validated?**
   - 26 automated integration test cases (`npm test`) were executed directly against a live local MongoDB instance, verifying authentication, RBAC, POS checkout, atomic decrements, duplicate reorder prevention, and AI recommendation endpoints.
4. **What was the biggest lesson learned from working with AI?**
   - AI tools can generate code fast, but edge-case hardening (concurrency safety, client price manipulation, and environment tolerance) requires deliberate domain thinking and disciplined verification.
