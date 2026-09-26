const Supplier = require('../models/Supplier');

const getSuppliers = async (query = {}) => {
  const filter = {};
  if (query.status) {
    filter.status = query.status.toUpperCase();
  }
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { contactPerson: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
    ];
  }
  return await Supplier.find(filter).sort({ name: 1 });
};

const getSupplierById = async (id) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    error.errorCode = 'SUPPLIER_NOT_FOUND';
    throw error;
  }
  return supplier;
};

const createSupplier = async (data) => {
  const { name, contactPerson, phone, email, address, status } = data;
  if (!name || !contactPerson || !phone || !email) {
    const error = new Error('Name, contact person, phone, and email are required');
    error.statusCode = 400;
    error.errorCode = 'VALIDATION_ERROR';
    throw error;
  }

  return await Supplier.create({
    name: name.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    address: address ? address.trim() : '',
    status: status || 'ACTIVE',
  });
};

const updateSupplier = async (id, data) => {
  const supplier = await getSupplierById(id);
  const { name, contactPerson, phone, email, address, status } = data;

  if (name) supplier.name = name.trim();
  if (contactPerson) supplier.contactPerson = contactPerson.trim();
  if (phone) supplier.phone = phone.trim();
  if (email) supplier.email = email.trim().toLowerCase();
  if (address !== undefined) supplier.address = address.trim();
  if (status) supplier.status = status;

  return await supplier.save();
};

const toggleSupplierStatus = async (id) => {
  const supplier = await getSupplierById(id);
  supplier.status = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return await supplier.save();
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
};
