const Customer = require('../models/Customer');

const getCustomers = async (query = {}) => {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  return await Customer.find(filter).sort({ name: 1 });
};

const getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    error.errorCode = 'CUSTOMER_NOT_FOUND';
    throw error;
  }
  return customer;
};

const createCustomer = async (data) => {
  const { name, phone, email, address } = data;
  if (!name || !phone) {
    const error = new Error('Customer name and phone number are required');
    error.statusCode = 400;
    error.errorCode = 'VALIDATION_ERROR';
    throw error;
  }

  const cleanPhone = phone.trim();
  const existing = await Customer.findOne({ phone: cleanPhone });
  if (existing) {
    const error = new Error(`Customer with phone '${cleanPhone}' already exists`);
    error.statusCode = 409;
    error.errorCode = 'DUPLICATE_PHONE';
    throw error;
  }

  return await Customer.create({
    name: name.trim(),
    phone: cleanPhone,
    email: email ? email.trim().toLowerCase() : '',
    address: address ? address.trim() : '',
  });
};

const updateCustomer = async (id, data) => {
  const customer = await getCustomerById(id);
  const { name, phone, email, address } = data;

  if (phone) {
    const cleanPhone = phone.trim();
    if (cleanPhone !== customer.phone) {
      const existing = await Customer.findOne({ phone: cleanPhone });
      if (existing) {
        const error = new Error(`Customer with phone '${cleanPhone}' already exists`);
        error.statusCode = 409;
        error.errorCode = 'DUPLICATE_PHONE';
        throw error;
      }
      customer.phone = cleanPhone;
    }
  }

  if (name) customer.name = name.trim();
  if (email !== undefined) customer.email = email.trim().toLowerCase();
  if (address !== undefined) customer.address = address.trim();

  return await customer.save();
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};
