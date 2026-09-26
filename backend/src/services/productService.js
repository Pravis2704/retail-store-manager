const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');
const StockTransaction = require('../models/StockTransaction');
const SaleItem = require('../models/SaleItem');

const getProducts = async (query = {}, userRole = 'SALES_STAFF') => {
  const filter = {};

  // Sales staff can only view active products
  if (userRole === 'SALES_STAFF') {
    filter.isActive = true;
  } else if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.supplier) {
    filter.supplier = query.supplier;
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { sku: { $regex: query.search, $options: 'i' } },
      { category: { $regex: query.search, $options: 'i' } },
    ];
  }

  const products = await Product.find(filter)
    .populate('supplier', 'name email phone status')
    .sort({ name: 1 })
    .lean();

  // Attach live inventory details to each product for fast frontend access
  const productIds = products.map((p) => p._id);
  const inventories = await Inventory.find({ product: { $in: productIds } }).lean();

  const inventoryMap = {};
  inventories.forEach((inv) => {
    inventoryMap[inv.product.toString()] = inv;
  });

  return products.map((p) => ({
    ...p,
    inventory: inventoryMap[p._id.toString()] || {
      currentStock: 0,
      reorderLevel: p.reorderLevel,
      maximumStock: p.maximumStock,
      status: 'OUT_OF_STOCK',
    },
  }));
};

const getProductById = async (id) => {
  const product = await Product.findById(id).populate('supplier', 'name email phone status').lean();
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.errorCode = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const inventory = await Inventory.findOne({ product: product._id }).lean();
  return {
    ...product,
    inventory: inventory || {
      currentStock: 0,
      reorderLevel: product.reorderLevel,
      maximumStock: product.maximumStock,
      status: 'OUT_OF_STOCK',
    },
  };
};

const createProduct = async (data, userId) => {
  const {
    name,
    sku,
    category,
    description,
    costPrice,
    sellingPrice,
    reorderLevel,
    maximumStock,
    supplier: supplierId,
    unit,
    initialStock = 0,
  } = data;

  // 1. Validation
  if (!name || !sku || !category || costPrice === undefined || sellingPrice === undefined || reorderLevel === undefined || maximumStock === undefined || !supplierId) {
    const error = new Error('Please provide all required product fields');
    error.statusCode = 400;
    error.errorCode = 'MISSING_FIELDS';
    throw error;
  }

  if (Number(costPrice) < 0 || Number(sellingPrice) < 0) {
    const error = new Error('Prices cannot be negative');
    error.statusCode = 400;
    error.errorCode = 'NEGATIVE_PRICE';
    throw error;
  }

  if (Number(reorderLevel) < 0) {
    const error = new Error('Reorder level cannot be negative');
    error.statusCode = 400;
    error.errorCode = 'NEGATIVE_REORDER_LEVEL';
    throw error;
  }

  if (Number(maximumStock) <= Number(reorderLevel)) {
    const error = new Error('Maximum stock must be greater than reorder level');
    error.statusCode = 400;
    error.errorCode = 'INVALID_STOCK_THRESHOLDS';
    throw error;
  }

  const cleanSku = sku.trim().toUpperCase();
  const existingSku = await Product.findOne({ sku: cleanSku });
  if (existingSku) {
    const error = new Error(`Product with SKU '${cleanSku}' already exists`);
    error.statusCode = 400;
    error.errorCode = 'DUPLICATE_SKU';
    throw error;
  }

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    error.errorCode = 'SUPPLIER_NOT_FOUND';
    throw error;
  }

  // 2. Create Product
  const product = await Product.create({
    name: name.trim(),
    sku: cleanSku,
    category: category.trim(),
    description: description ? description.trim() : '',
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    reorderLevel: Number(reorderLevel),
    maximumStock: Number(maximumStock),
    supplier: supplier._id,
    unit: unit ? unit.trim() : 'pcs',
    isActive: true,
  });

  // 3. Initialize Inventory
  const stockVal = Math.max(0, Number(initialStock) || 0);
  const status = Inventory.calculateStatus(stockVal, Number(reorderLevel));

  const inventory = await Inventory.create({
    product: product._id,
    currentStock: stockVal,
    reorderLevel: Number(reorderLevel),
    maximumStock: Number(maximumStock),
    status,
    lastRestockedAt: stockVal > 0 ? new Date() : null,
  });

  // 4. Log initial stock transaction if initial stock provided
  if (stockVal > 0 && userId) {
    await StockTransaction.create({
      product: product._id,
      transactionType: 'PURCHASE',
      quantity: stockVal,
      previousStock: 0,
      newStock: stockVal,
      referenceId: 'INITIAL-STOCK',
      referenceType: 'Initial Setup',
      performedBy: userId,
      notes: 'Initial inventory configuration upon product creation',
    });
  }

  return {
    ...product.toObject(),
    inventory,
  };
};

const updateProduct = async (id, data) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.errorCode = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const {
    name,
    sku,
    category,
    description,
    costPrice,
    sellingPrice,
    reorderLevel,
    maximumStock,
    supplier: supplierId,
    unit,
  } = data;

  if (sku) {
    const cleanSku = sku.trim().toUpperCase();
    if (cleanSku !== product.sku) {
      const existingSku = await Product.findOne({ sku: cleanSku });
      if (existingSku) {
        const error = new Error(`Product with SKU '${cleanSku}' already exists`);
        error.statusCode = 400;
        error.errorCode = 'DUPLICATE_SKU';
        throw error;
      }
      product.sku = cleanSku;
    }
  }

  if (costPrice !== undefined) {
    if (Number(costPrice) < 0) {
      const error = new Error('Cost price cannot be negative');
      error.statusCode = 400;
      throw error;
    }
    product.costPrice = Number(costPrice);
  }

  if (sellingPrice !== undefined) {
    if (Number(sellingPrice) < 0) {
      const error = new Error('Selling price cannot be negative');
      error.statusCode = 400;
      throw error;
    }
    product.sellingPrice = Number(sellingPrice);
  }

  const newReorderLevel = reorderLevel !== undefined ? Number(reorderLevel) : product.reorderLevel;
  const newMaxStock = maximumStock !== undefined ? Number(maximumStock) : product.maximumStock;

  if (newReorderLevel < 0) {
    const error = new Error('Reorder level cannot be negative');
    error.statusCode = 400;
    throw error;
  }

  if (newMaxStock <= newReorderLevel) {
    const error = new Error('Maximum stock must be greater than reorder level');
    error.statusCode = 400;
    throw error;
  }

  product.reorderLevel = newReorderLevel;
  product.maximumStock = newMaxStock;

  if (name) product.name = name.trim();
  if (category) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (unit) product.unit = unit.trim();
  if (supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      const error = new Error('Supplier not found');
      error.statusCode = 404;
      throw error;
    }
    product.supplier = supplier._id;
  }

  await product.save();

  // Synchronize thresholds with inventory record
  const inventory = await Inventory.findOne({ product: product._id });
  if (inventory) {
    inventory.reorderLevel = product.reorderLevel;
    inventory.maximumStock = product.maximumStock;
    inventory.status = Inventory.calculateStatus(inventory.currentStock, inventory.reorderLevel);
    await inventory.save();
  }

  return await getProductById(product._id);
};

const toggleProductStatus = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.errorCode = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  product.isActive = !product.isActive;
  await product.save();

  return await getProductById(product._id);
};

const getCategories = async () => {
  return await Product.distinct('category');
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  getCategories,
};
