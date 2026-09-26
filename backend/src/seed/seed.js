require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const StockTransaction = require('../models/StockTransaction');
const ReorderRequest = require('../models/ReorderRequest');
const { generateSaleNumber, generateReorderNumber } = require('../utils/idGenerator');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/retail_store_db';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Customer.deleteMany({}),
      Sale.deleteMany({}),
      SaleItem.deleteMany({}),
      StockTransaction.deleteMany({}),
      ReorderRequest.deleteMany({}),
    ]);

    console.log('[Seed] Creating demo users...');
    const adminPasswordHash = await User.hashPassword('Admin@123');
    const managerPasswordHash = await User.hashPassword('Manager@123');
    const staffPasswordHash = await User.hashPassword('Staff@123');

    const admin = await User.create({
      name: 'Aditya Sharma (Store Owner)',
      email: 'admin@retail.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    });

    const manager = await User.create({
      name: 'Rajesh Verma (Shift Manager)',
      email: 'manager@retail.com',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
      isActive: true,
    });

    const staff = await User.create({
      name: 'Pooja Nair (POS Cashier)',
      email: 'staff@retail.com',
      passwordHash: staffPasswordHash,
      role: 'SALES_STAFF',
      isActive: true,
    });

    console.log('[Seed] Users created: Admin, Manager, Sales Staff');

    console.log('[Seed] Creating suppliers...');
    const suppliers = await Supplier.create([
      {
        name: 'Apex Agro Goods Pvt Ltd',
        contactPerson: 'Suresh Kumar',
        phone: '+91 98765 43210',
        email: 'sales@apexagro.com',
        address: 'Sector 18, Vashi Wholesale Market, Navi Mumbai',
        status: 'ACTIVE',
      },
      {
        name: 'Heritage Dairy Products',
        contactPerson: 'Meena Iyer',
        phone: '+91 98220 11223',
        email: 'orders@heritagedairy.in',
        address: 'Plot 42, Anand Industrial Estate, Gujarat',
        status: 'ACTIVE',
      },
      {
        name: 'Himalayan Spring Beverages',
        contactPerson: 'Vikram Singh',
        phone: '+91 99112 33445',
        email: 'supply@himalayansprings.com',
        address: 'Industrial Area Phase 2, Chandigarh',
        status: 'ACTIVE',
      },
      {
        name: 'Golden Harvest Milling Co.',
        contactPerson: 'Deepak Patel',
        phone: '+91 98450 99887',
        email: 'info@goldenharvest.co.in',
        address: 'Ring Road Industrial Hub, Surat',
        status: 'ACTIVE',
      },
      {
        name: 'Global Imports & FMCG (Inactive)',
        contactPerson: 'Karan Mehra',
        phone: '+91 97110 55667',
        email: 'karan@globalfmcg.com',
        address: 'Nariman Point, Mumbai',
        status: 'INACTIVE', // For testing inactive supplier validation
      },
    ]);

    const [supAgro, supDairy, supBev, supMilling, supInactive] = suppliers;

    console.log('[Seed] Creating customer directory...');
    const customers = await Customer.create([
      {
        name: 'Rohan Deshmukh',
        phone: '9820123456',
        email: 'rohan.deshmukh@gmail.com',
        address: 'B-402, Sunshine Heights, Andheri West',
        totalPurchases: 2,
        totalSpent: 1850,
      },
      {
        name: 'Ananya Roy',
        phone: '9833445566',
        email: 'ananya.roy@yahoo.com',
        address: 'Flat 12, Green Acres, Bandra West',
        totalPurchases: 1,
        totalSpent: 720,
      },
      {
        name: 'Sunil Rao',
        phone: '9845012345',
        email: 'sunil.rao@outlook.com',
        address: 'A-101, Palm Meadows, Powai',
        totalPurchases: 3,
        totalSpent: 3100,
      },
      {
        name: 'Priyanka Mehta',
        phone: '9920887766',
        email: 'priyanka.m@gmail.com',
        address: 'Building 5, Chembur Colony',
        totalPurchases: 0,
        totalSpent: 0,
      },
    ]);

    console.log('[Seed] Creating products and initializing inventory...');
    const productSpecs = [
      {
        name: 'Basmati Rice Premium 5kg',
        sku: 'RICE-5KG',
        category: 'Grains & Staples',
        description: 'Aged long-grain royal basmati rice with fragrant aroma.',
        costPrice: 420,
        sellingPrice: 550,
        reorderLevel: 10,
        maximumStock: 50,
        supplier: supAgro._id,
        unit: 'bag',
        currentStock: 12, // Near reorder level (Demo target for trigger!)
      },
      {
        name: 'Whole Wheat Atta 10kg',
        sku: 'ATTA-10KG',
        category: 'Grains & Staples',
        description: '100% stone ground whole wheat flour with dietary fiber.',
        costPrice: 310,
        sellingPrice: 395,
        reorderLevel: 15,
        maximumStock: 60,
        supplier: supMilling._id,
        unit: 'bag',
        currentStock: 35, // Normal stock
      },
      {
        name: 'Farm Fresh Cow Milk 1L',
        sku: 'MILK-1L',
        category: 'Dairy & Eggs',
        description: 'Pasteurized homogenized pure cow milk carton.',
        costPrice: 52,
        sellingPrice: 68,
        reorderLevel: 20,
        maximumStock: 100,
        supplier: supDairy._id,
        unit: 'carton',
        currentStock: 8, // Low Stock! (Triggered)
      },
      {
        name: 'Organic Salted Butter 500g',
        sku: 'BUTTER-500G',
        category: 'Dairy & Eggs',
        description: 'Rich creamy pasteurized butter made from churned cream.',
        costPrice: 195,
        sellingPrice: 245,
        reorderLevel: 8,
        maximumStock: 40,
        supplier: supDairy._id,
        unit: 'pack',
        currentStock: 25, // Normal stock
      },
      {
        name: 'Natural Spring Mineral Water 1L',
        sku: 'WATER-1L',
        category: 'Beverages',
        description: 'Bottled natural alkaline mineral spring water.',
        costPrice: 12,
        sellingPrice: 20,
        reorderLevel: 25,
        maximumStock: 150,
        supplier: supBev._id,
        unit: 'bottle',
        currentStock: 80, // Normal stock
      },
      {
        name: 'Artisan Green Tea 100g',
        sku: 'TEA-GREEN-100G',
        category: 'Beverages',
        description: 'Handpicked antioxidant-rich loose leaf Darjeeling green tea.',
        costPrice: 160,
        sellingPrice: 220,
        reorderLevel: 10,
        maximumStock: 40,
        supplier: supBev._id,
        unit: 'box',
        currentStock: 4, // Critical Low Stock!
      },
      {
        name: 'Extra Virgin Olive Oil 1L',
        sku: 'OIL-OLIVE-1L',
        category: 'Cooking Oils',
        description: 'Cold-pressed extra virgin culinary olive oil.',
        costPrice: 650,
        sellingPrice: 850,
        reorderLevel: 6,
        maximumStock: 30,
        supplier: supAgro._id,
        unit: 'bottle',
        currentStock: 18, // Normal stock
      },
      {
        name: 'Toor Dal Premium 1kg',
        sku: 'DAL-TOOR-1KG',
        category: 'Grains & Staples',
        description: 'Unpolished protein-rich yellow pigeon peas.',
        costPrice: 110,
        sellingPrice: 145,
        reorderLevel: 15,
        maximumStock: 60,
        supplier: supMilling._id,
        unit: 'pouch',
        currentStock: 0, // OUT OF STOCK!
      },
      {
        name: 'Alphonso Mango Pulp 850g',
        sku: 'MANGO-PULP-850G',
        category: 'Beverages',
        description: '100% natural sweet Alphonso mango puree tin.',
        costPrice: 140,
        sellingPrice: 190,
        reorderLevel: 10,
        maximumStock: 50,
        supplier: supBev._id,
        unit: 'can',
        currentStock: 32, // Normal stock
      },
      {
        name: 'Rolled Oats Classic 1kg',
        sku: 'OATS-1KG',
        category: 'Breakfast Cereals',
        description: 'Gluten-free 100% wholegrain high-fiber rolled breakfast oats.',
        costPrice: 130,
        sellingPrice: 175,
        reorderLevel: 12,
        maximumStock: 50,
        supplier: supMilling._id,
        unit: 'pack',
        currentStock: 22, // Normal stock
      },
      {
        name: 'Pure Desi Ghee 1L',
        sku: 'GHEE-1L',
        category: 'Dairy & Eggs',
        description: 'Traditional bilona churned aromatic clarified cow butter.',
        costPrice: 580,
        sellingPrice: 720,
        reorderLevel: 8,
        maximumStock: 35,
        supplier: supDairy._id,
        unit: 'jar',
        currentStock: 15, // Normal stock
      },
      {
        name: 'Dark Chocolate Almond Bar 100g',
        sku: 'CHOC-ALMOND-100G',
        category: 'Snacks & Confectionery',
        description: '70% rich dark chocolate loaded with roasted California almonds.',
        costPrice: 85,
        sellingPrice: 125,
        reorderLevel: 15,
        maximumStock: 80,
        supplier: supAgro._id,
        unit: 'bar',
        currentStock: 45, // Normal stock
      },
    ];

    const createdProducts = [];
    const createdInventories = [];

    for (const spec of productSpecs) {
      const { currentStock, ...prodData } = spec;
      const product = await Product.create(prodData);
      createdProducts.push(product);

      const status = Inventory.calculateStatus(currentStock, product.reorderLevel);
      const inventory = await Inventory.create({
        product: product._id,
        currentStock,
        reorderLevel: product.reorderLevel,
        maximumStock: product.maximumStock,
        status,
        lastRestockedAt: currentStock > 0 ? new Date(Date.now() - 3 * 24 * 3600 * 1000) : null,
      });
      createdInventories.push(inventory);

      // Record setup stock transaction
      if (currentStock > 0) {
        await StockTransaction.create({
          product: product._id,
          transactionType: 'PURCHASE',
          quantity: currentStock,
          previousStock: 0,
          newStock: currentStock,
          referenceId: 'INIT-BATCH-001',
          referenceType: 'Warehouse Inward',
          performedBy: admin._id,
          notes: 'Initial warehouse stocking during store rollout',
        });
      }
    }

    console.log(`[Seed] Created ${createdProducts.length} products with inventories`);

    // Create a pending reorder for the low-stock milk
    const milkProduct = createdProducts.find((p) => p.sku === 'MILK-1L');
    const milkInventory = createdInventories.find((i) => i.product.toString() === milkProduct._id.toString());
    const milkReorder = await ReorderRequest.create({
      requestNumber: 'ORD-DEMO-0001',
      product: milkProduct._id,
      supplier: milkProduct.supplier,
      currentStock: milkInventory.currentStock,
      reorderLevel: milkInventory.reorderLevel,
      maximumStock: milkInventory.maximumStock,
      recommendedQuantity: milkInventory.maximumStock - milkInventory.currentStock, // 100 - 8 = 92
      status: 'PENDING',
      requestedBy: staff._id,
    });

    // Create an approved & completed reorder for oats to show history
    const oatsProduct = createdProducts.find((p) => p.sku === 'OATS-1KG');
    await ReorderRequest.create({
      requestNumber: 'ORD-HIST-0002',
      product: oatsProduct._id,
      supplier: oatsProduct.supplier,
      currentStock: 10,
      reorderLevel: oatsProduct.reorderLevel,
      maximumStock: oatsProduct.maximumStock,
      recommendedQuantity: 20,
      receivedQuantity: 20,
      status: 'COMPLETED',
      requestedBy: manager._id,
      approvedBy: admin._id,
      approvedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });

    console.log('[Seed] Reorder requests seeded: 1 PENDING (Milk), 1 COMPLETED (Oats)');

    // Create sample completed sales
    console.log('[Seed] Creating demo sales transactions...');
    const riceProd = createdProducts.find((p) => p.sku === 'RICE-5KG');
    const butterProd = createdProducts.find((p) => p.sku === 'BUTTER-500G');
    const waterProd = createdProducts.find((p) => p.sku === 'WATER-1L');

    // Sale 1: Cash sale
    const sale1Number = generateSaleNumber();
    const sale1 = await Sale.create({
      saleNumber: sale1Number,
      customer: customers[0]._id,
      items: [],
      subtotal: riceProd.sellingPrice * 2 + butterProd.sellingPrice * 1, // 550*2 + 245 = 1345
      discount: 45,
      totalAmount: 1300,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      soldBy: staff._id,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours ago
    });

    const s1Item1 = await SaleItem.create({
      sale: sale1._id,
      product: riceProd._id,
      quantity: 2,
      unitPrice: riceProd.sellingPrice,
      totalPrice: riceProd.sellingPrice * 2,
    });
    const s1Item2 = await SaleItem.create({
      sale: sale1._id,
      product: butterProd._id,
      quantity: 1,
      unitPrice: butterProd.sellingPrice,
      totalPrice: butterProd.sellingPrice * 1,
    });

    sale1.items = [s1Item1._id, s1Item2._id];
    await sale1.save();

    await StockTransaction.create({
      product: riceProd._id,
      transactionType: 'SALE',
      quantity: -2,
      previousStock: 14,
      newStock: 12,
      referenceId: sale1Number,
      referenceType: 'Sale',
      performedBy: staff._id,
      notes: 'POS checkout tender: CASH',
    });

    // Sale 2: UPI sale
    const sale2Number = generateSaleNumber();
    const sale2 = await Sale.create({
      saleNumber: sale2Number,
      customer: customers[1]._id,
      items: [],
      subtotal: waterProd.sellingPrice * 5, // 20 * 5 = 100
      discount: 0,
      totalAmount: 100,
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      soldBy: staff._id,
      createdAt: new Date(Date.now() - 1 * 3600 * 1000), // 1 hour ago
    });

    const s2Item1 = await SaleItem.create({
      sale: sale2._id,
      product: waterProd._id,
      quantity: 5,
      unitPrice: waterProd.sellingPrice,
      totalPrice: waterProd.sellingPrice * 5,
    });

    sale2.items = [s2Item1._id];
    await sale2.save();

    await StockTransaction.create({
      product: waterProd._id,
      transactionType: 'SALE',
      quantity: -5,
      previousStock: 85,
      newStock: 80,
      referenceId: sale2Number,
      referenceType: 'Sale',
      performedBy: staff._id,
      notes: 'POS checkout tender: UPI',
    });

    console.log('[Seed] Database populated successfully!');
    console.log('\n================ DEMO ACCOUNTS ================');
    console.log('1. Admin:       admin@retail.com   / Admin@123   (Full Control)');
    console.log('2. Manager:     manager@retail.com / Manager@123 (Approvals & Inventory)');
    console.log('3. Sales Staff: staff@retail.com   / Staff@123   (POS Checkout)');
    console.log('================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
