process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('../src/server');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
let adminToken = '';
let managerToken = '';
let staffToken = '';
let adminUser = null;
let managerUser = null;
let staffUser = null;

let passed = 0;
let failed = 0;

const assert = (condition, message, testId = '') => {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m [${testId || 'PASS'}] ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m [${testId || 'FAIL'}] ${message}`);
    failed++;
  }
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   RETAIL STORE MANAGER — BACKEND INTEGRATION TESTS   ');
  console.log('======================================================\n');

  // Start HTTP server on test port
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION & RBAC TESTS
    // ----------------------------------------------------
    console.log('\x1b[34m--- 1. Authentication & Role-Based Access Control ---\x1b[0m');

    // TC-AUTH-01: Valid admin login
    const adminLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@retail.com', password: 'Admin@123' }),
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.success && adminLoginRes.data.data.token, 'Admin valid login succeeds with JWT', 'TC-AUTH-01');
    adminToken = adminLoginRes.data.data.token;
    adminUser = adminLoginRes.data.data.user;

    // Login Manager
    const mgrLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@retail.com', password: 'Manager@123' }),
    });
    managerToken = mgrLoginRes.data.data.token;
    managerUser = mgrLoginRes.data.data.user;

    // Login Sales Staff
    const staffLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@retail.com', password: 'Staff@123' }),
    });
    staffToken = staffLoginRes.data.data.token;
    staffUser = staffLoginRes.data.data.user;

    // TC-AUTH-02: Invalid password
    const invalidLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@retail.com', password: 'WrongPassword999!' }),
    });
    assert(invalidLoginRes.status === 401 && !invalidLoginRes.data.success, 'Invalid credentials rejected with 401', 'TC-AUTH-02');

    // TC-AUTH-03: Unauthenticated access to protected route
    const unauthRes = await apiRequest('/inventory');
    assert(unauthRes.status === 401 && !unauthRes.data.success, 'Request without token rejected with 401', 'TC-AUTH-03');

    // TC-AUTH-04: Role restriction (Sales staff attempting to create product)
    const staffForbiddenRes = await apiRequest('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ name: 'Unauthorized Item' }),
    });
    assert(staffForbiddenRes.status === 403 && !staffForbiddenRes.data.success, 'Sales staff creating product rejected with 403 Forbidden', 'TC-AUTH-04');

    // ----------------------------------------------------
    // 2. PRODUCT CATALOG & SUPPLIERS
    // ----------------------------------------------------
    console.log('\n\x1b[34m--- 2. Product Catalog & Supplier Validation ---\x1b[0m');

    // Fetch suppliers
    const suppliersRes = await apiRequest('/suppliers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeSupplier = suppliersRes.data.data.find((s) => s.status === 'ACTIVE');
    const inactiveSupplier = suppliersRes.data.data.find((s) => s.status === 'INACTIVE');

    // TC-PROD-01: Create valid product
    const testSku = `TEST-ITEM-${Date.now().toString().slice(-4)}`;
    const createProdRes = await apiRequest('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Organic Honey 500g',
        sku: testSku,
        category: 'Breakfast Cereals',
        costPrice: 150,
        sellingPrice: 220,
        reorderLevel: 5,
        maximumStock: 25,
        supplier: activeSupplier._id,
        unit: 'jar',
        initialStock: 20,
      }),
    });
    assert(createProdRes.status === 201 && createProdRes.data.data.sku === testSku, 'Product created and inventory initialized', 'TC-PROD-01');
    const createdProduct = createProdRes.data.data;

    // TC-PROD-02: Duplicate SKU rejection
    const duplicateSkuRes = await apiRequest('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Duplicate SKU Item',
        sku: testSku,
        category: 'Breakfast Cereals',
        costPrice: 100,
        sellingPrice: 150,
        reorderLevel: 5,
        maximumStock: 20,
        supplier: activeSupplier._id,
      }),
    });
    assert(duplicateSkuRes.status === 400 && duplicateSkuRes.data.errorCode === 'DUPLICATE_SKU', 'Duplicate SKU rejected with 400', 'TC-PROD-02');

    // TC-PROD-03: Negative price validation
    const negativePriceRes = await apiRequest('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Negative Price Item',
        sku: `NEG-${Date.now().toString().slice(-4)}`,
        category: 'Test',
        costPrice: -50,
        sellingPrice: 100,
        reorderLevel: 5,
        maximumStock: 20,
        supplier: activeSupplier._id,
      }),
    });
    assert(negativePriceRes.status === 400 && negativePriceRes.data.errorCode === 'NEGATIVE_PRICE', 'Negative price rejected with 400', 'TC-PROD-03');

    // TC-PROD-04: Maximum stock <= reorder level validation
    const invalidThresholdsRes = await apiRequest('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Bad Threshold Item',
        sku: `BAD-TH-${Date.now().toString().slice(-4)}`,
        category: 'Test',
        costPrice: 50,
        sellingPrice: 100,
        reorderLevel: 30,
        maximumStock: 20, // Less than reorder level
        supplier: activeSupplier._id,
      }),
    });
    assert(invalidThresholdsRes.status === 400 && invalidThresholdsRes.data.errorCode === 'INVALID_STOCK_THRESHOLDS', 'Max stock <= reorder level rejected with 400', 'TC-PROD-04');

    // ----------------------------------------------------
    // 3. SALES / POS & STOCK DEDUCTION
    // ----------------------------------------------------
    console.log('\n\x1b[34m--- 3. Sales / POS & Concurrency-Safe Stock Deduction ---\x1b[0m');

    // Fetch existing customer
    const customersRes = await apiRequest('/customers', {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const demoCustomer = customersRes.data.data[0];

    // TC-SALE-01: Successful sale execution
    const sale1Res = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        customerId: demoCustomer._id,
        items: [{ productId: createdProduct._id, quantity: 5 }],
        discount: 20,
        paymentMethod: 'UPI',
      }),
    });
    assert(
      sale1Res.status === 201 &&
      sale1Res.data.data.totalAmount === (220 * 5 - 20) &&
      sale1Res.data.data.saleNumber.startsWith('SALE-'),
      'Sale completed: calculated totals correctly and returned saleNumber',
      'TC-SALE-01'
    );

    // Verify stock decremented: 20 - 5 = 15
    const invCheck1 = await apiRequest(`/inventory/product/${createdProduct._id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(invCheck1.data.data.currentStock === 15, 'Stock correctly decremented from 20 to 15', 'TC-INV-01');

    // TC-SALE-02: Insufficient stock rejection
    const insufficientStockRes = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: createdProduct._id, quantity: 20 }], // only 15 available
        paymentMethod: 'CASH',
      }),
    });
    assert(insufficientStockRes.status === 400 && insufficientStockRes.data.errorCode === 'INSUFFICIENT_STOCK', 'Excessive quantity rejected with INSUFFICIENT_STOCK', 'TC-SALE-02');

    // TC-SALE-03: Zero stock product attempt
    // Find out of stock item (DAL-TOOR-1KG from seed)
    const outOfStockProdRes = await apiRequest('/products?search=DAL-TOOR-1KG', {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const oosProduct = outOfStockProdRes.data.data[0];
    const oosSaleRes = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: oosProduct._id, quantity: 1 }],
        paymentMethod: 'CASH',
      }),
    });
    assert(oosSaleRes.status === 400 && oosSaleRes.data.errorCode === 'OUT_OF_STOCK', 'Zero stock purchase blocked with OUT_OF_STOCK', 'TC-SALE-03');

    // TC-SALE-04: Empty cart validation
    const emptyCartRes = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ items: [], paymentMethod: 'CASH' }),
    });
    assert(emptyCartRes.status === 400 && emptyCartRes.data.errorCode === 'EMPTY_CART', 'Empty cart rejected with 400', 'TC-SALE-04');

    // TC-SALE-05: Excessive discount validation
    const excessiveDiscountRes = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: createdProduct._id, quantity: 1 }],
        discount: 9999, // exceeds item subtotal
        paymentMethod: 'CASH',
      }),
    });
    assert(excessiveDiscountRes.status === 400 && excessiveDiscountRes.data.errorCode === 'DISCOUNT_EXCEEDS_SUBTOTAL', 'Discount exceeding subtotal rejected with 400', 'TC-SALE-05');

    // ----------------------------------------------------
    // 4. LOW STOCK DETECTION & REORDER WORKFLOW
    // ----------------------------------------------------
    console.log('\n\x1b[34m--- 4. Low Stock Trigger & Automated Reorder Workflow ---\x1b[0m');

    // Sell 11 more units of createdProduct (currentStock = 15, reorderLevel = 5)
    // 15 - 11 = 4 units remaining (<= reorderLevel of 5 -> triggers LOW_STOCK and auto ReorderRequest!)
    const triggerSaleRes = await apiRequest('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: createdProduct._id, quantity: 11 }],
        paymentMethod: 'CARD',
      }),
    });
    assert(triggerSaleRes.status === 201, 'Sale executed reducing stock below reorder level (15 -> 4)', 'TC-SALE-06');

    // Verify inventory status transitioned to LOW_STOCK
    const invCheckLow = await apiRequest(`/inventory/product/${createdProduct._id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(invCheckLow.data.data.status === 'LOW_STOCK' && invCheckLow.data.data.currentStock === 4, 'Inventory status automatically calculated as LOW_STOCK', 'TC-INV-02');

    // TC-REORD-01: Auto-generated Reorder Request check
    const reordersListRes = await apiRequest(`/reorders?productId=${createdProduct._id}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const autoReorder = reordersListRes.data.data.find((r) => r.status === 'PENDING');
    // recommendedQuantity should be maxStock (25) - currentStock (4) = 21
    assert(
      autoReorder !== undefined &&
      autoReorder.recommendedQuantity === 21 &&
      autoReorder.status === 'PENDING',
      'Automatic reorder generated with recommendedQuantity = (Max - Current = 21)',
      'TC-REORD-01'
    );

    // TC-REORD-02: Prevent duplicate pending reorder
    const duplicateReorderRes = await apiRequest('/reorders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        productId: createdProduct._id,
        quantity: 10,
      }),
    });
    assert(duplicateReorderRes.status === 409 && duplicateReorderRes.data.errorCode === 'DUPLICATE_PENDING_REORDER', 'Duplicate pending reorder request prevented with 409 Conflict', 'TC-REORD-02');

    // TC-REORD-03: Manager approval of reorder
    const approveRes = await apiRequest(`/reorders/${autoReorder._id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(approveRes.status === 200 && approveRes.data.data.status === 'APPROVED', 'Manager approved reorder request', 'TC-REORD-03');

    // TC-REORD-04: Goods receipt and stock replenishment
    const receiveRes = await apiRequest(`/reorders/${autoReorder._id}/receive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ receivedQuantity: 21 }),
    });
    assert(
      receiveRes.status === 200 &&
      receiveRes.data.data.status === 'COMPLETED' &&
      receiveRes.data.data.receivedQuantity === 21,
      'Goods received: Reorder marked COMPLETED with verified quantity',
      'TC-REORD-04'
    );

    // Verify inventory replenished: 4 + 21 = 25 units (NORMAL status)
    const invReplenished = await apiRequest(`/inventory/product/${createdProduct._id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(
      invReplenished.data.data.currentStock === 25 &&
      invReplenished.data.data.status === 'NORMAL',
      'Inventory replenished to 25 units and status returned to NORMAL',
      'TC-INV-03'
    );

    // Verify PURCHASE transaction logged in stock audit ledger
    const auditRes = await apiRequest(`/inventory/transactions?productId=${createdProduct._id}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const purchaseLog = auditRes.data.data.find((t) => t.transactionType === 'PURCHASE' && t.quantity === 21);
    assert(purchaseLog !== undefined && purchaseLog.newStock === 25, 'Immutable PURCHASE StockTransaction audit record created', 'TC-INV-04');

    // ----------------------------------------------------
    // 5. DASHBOARD & REPORTING AGGREGATION
    // ----------------------------------------------------
    console.log('\n\x1b[34m--- 5. Real-Time Dashboard & Reporting Aggregations ---\x1b[0m');

    const dashRes = await apiRequest('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      dashRes.status === 200 &&
      dashRes.data.data.kpis.totalProducts >= 12 &&
      dashRes.data.data.kpis.totalSalesToday >= 3,
      'Dashboard returns real-time dynamic KPIs aggregated from DB',
      'TC-DASH-01'
    );

    const salesReportRes = await apiRequest('/reports/sales?period=today', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      salesReportRes.status === 200 &&
      salesReportRes.data.data.summary.totalSales >= 3 &&
      salesReportRes.data.data.summary.netRevenue > 0,
      'Sales report calculated revenue and payment breakdown',
      'TC-REP-01'
    );

    const invReportRes = await apiRequest('/reports/inventory', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      invReportRes.status === 200 &&
      invReportRes.data.data.summary.totalCostValuation > 0 &&
      invReportRes.data.data.summary.totalRetailValuation > 0,
      'Inventory report computed total cost and retail valuation',
      'TC-REP-02'
    );

    // ----------------------------------------------------
    // 6. OPTIONAL AI FEATURE: SMART REORDER ADVISOR
    // ----------------------------------------------------
    console.log('\n\x1b[34m--- 6. AI Smart Reorder Recommendation Engine ---\x1b[0m');

    const aiRes = await apiRequest('/reorders/ai-recommendations', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(
      aiRes.status === 200 &&
      Array.isArray(aiRes.data.data) &&
      aiRes.data.data.length > 0 &&
      aiRes.data.data[0].smartRecommendedQuantity >= 1 &&
      aiRes.data.data[0].reasoning !== undefined,
      'AI Smart Advisor generated demand forecast, lead time buffers, and explainable recommendations',
      'TC-AI-01'
    );

    console.log('\n======================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[Test Execution Error]:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
};

runTests();
