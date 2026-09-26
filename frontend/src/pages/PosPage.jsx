import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  Package,
  Store,
  Tag,
  AlertCircle,
} from 'lucide-react';

const PosPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [customerSaving, setCustomerSaving] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submittingSale, setSubmittingSale] = useState(false);

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  useEffect(() => {
    loadPosData();
  }, []);

  const loadPosData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/products/categories'),
      ]);
      setProducts(prodRes.data);
      setCustomers(custRes.data);
      setCategories(catRes.data);
    } catch (err) {
      showToast('Failed to load POS data: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    const currentStock = product.inventory?.currentStock || 0;
    if (currentStock <= 0) {
      showToast(`'${product.name}' is out of stock!`, 'warning');
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product._id === product._id);

    if (existingIndex > -1) {
      const existingItem = cart[existingIndex];
      if (existingItem.quantity + 1 > currentStock) {
        showToast(`Cannot add more. Only ${currentStock} units in stock.`, 'warning');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ]);
    }
  };

  const updateQuantity = (productId, newQty) => {
    const item = cart.find((i) => i.product._id === productId);
    if (!item) return;

    const currentStock = item.product.inventory?.currentStock || 0;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > currentStock) {
      showToast(`Cannot exceed available stock of ${currentStock} units.`, 'warning');
      return;
    }

    setCart(
      cart.map((i) => (i.product._id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId('');
  };

  // Quick Customer Creation Modal Handler
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      showToast('Name and phone number are required', 'warning');
      return;
    }

    setCustomerSaving(true);
    try {
      const res = await api.post('/customers', newCustomer);
      showToast('Customer registered successfully!', 'success');
      setCustomers([res.data, ...customers]);
      setSelectedCustomerId(res.data._id);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setNewCustomerModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to register customer', 'error');
    } finally {
      setCustomerSaving(false);
    }
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = Math.min(Number(discount) || 0, subtotal);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Complete Checkout Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products to checkout.', 'warning');
      return;
    }

    setSubmittingSale(true);
    try {
      const payload = {
        customerId: selectedCustomerId || null,
        items: cart.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
        })),
        discount: discountAmount,
        paymentMethod,
      };

      const res = await api.post('/sales', payload);
      showToast(`Sale #${res.data.saleNumber} completed successfully!`, 'success');

      // Save for receipt view
      setCompletedSale(res.data);
      setReceiptModalOpen(true);

      // Refresh product stock in real-time
      loadPosData();
      clearCart();
    } catch (err) {
      showToast(err.message || 'Failed to complete sale', 'error');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner text="Initializing POS terminal..." size="lg" />;
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-6">
      {/* LEFT SECTION: PRODUCT CATALOG & SEARCH */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 overflow-hidden">
        {/* Search & Categories Bar */}
        <div className="space-y-3 mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Scan barcode, SKU, or search product name..."
          />

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="No products match your search"
              description="Check your spelling or select a different category."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const stock = prod.inventory?.currentStock || 0;
                const status = prod.inventory?.status || 'OUT_OF_STOCK';
                const isOutOfStock = stock <= 0;

                return (
                  <button
                    key={prod._id}
                    type="button"
                    onClick={() => addToCart(prod)}
                    disabled={isOutOfStock}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-150 relative group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-brand-500 hover:shadow-md hover:shadow-brand-500/10'
                    }`}
                  >
                    {/* Header badge */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {prod.sku}
                      </span>
                      <StatusBadge status={status} className="text-[10px] px-2 py-0" />
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{prod.unit}</p>

                    <div className="mt-auto pt-3 flex items-center justify-between w-full border-t border-slate-100">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">
                          ₹{prod.sellingPrice}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          stock <= prod.reorderLevel ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {stock} in stock
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: ACTIVE CART & CHECKOUT TERMINAL */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 overflow-hidden">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Checkout Cart</h3>
              <p className="text-[10px] text-slate-400">{cart.length} unique line items</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Selector / Quick Register */}
        <div className="pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Customer
            </label>
            <button
              type="button"
              onClick={() => setNewCustomerModalOpen(true)}
              className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="">Walk-in Guest Customer (Cash)</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Cart is empty</p>
              <p className="text-[10px] text-slate-400">Click products on the left to add items</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product._id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h5>
                  <p className="text-[10px] text-slate-400">
                    ₹{item.unitPrice} × {item.quantity} = ₹{item.unitPrice * item.quantity}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product._id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Tender Selector */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {/* Discount Input */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-medium">Discount (₹)</span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 text-right px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Subtotal & Net Payable */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-100">
              <span>Grand Total</span>
              <span>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1" />
                Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                Card
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                UPI
              </button>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || submittingSale}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
          >
            {submittingSale ? (
              'Processing Sale...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete Sale (₹{totalAmount.toLocaleString('en-IN')})
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK NEW CUSTOMER MODAL */}
      <Modal
        isOpen={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        title="Quick Customer Registration"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              placeholder="e.g. 9820112233"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              placeholder="optional@gmail.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewCustomerModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={customerSaving}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {customerSaving ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* COMPLETED SALE RECEIPT / INVOICE MODAL */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Tax Invoice / Receipt"
        maxWidth="max-w-lg"
      >
        {completedSale && (
          <div className="space-y-4 text-slate-800 font-mono text-xs">
            {/* Printable Receipt Layout */}
            <div className="border border-dashed border-slate-300 p-5 rounded-2xl bg-slate-50/50 space-y-3">
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="text-base font-extrabold uppercase tracking-wider font-sans">
                  Retail Store Manager
                </h2>
                <p className="text-[11px] text-slate-500">Sector 18, Commercial Hub</p>
                <p className="text-[11px] text-slate-500">GSTIN: 27AABCR1234F1Z5</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold">Invoice:</span> {completedSale.saleNumber}
                </div>
                <div className="text-right">
                  <span className="font-bold">Date:</span> {new Date(completedSale.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-bold">Cashier:</span> {completedSale.soldBy?.name || user?.name}
                </div>
                <div className="text-right">
                  <span className="font-bold">Tender:</span> {completedSale.paymentMethod}
                </div>
                {completedSale.customer && (
                  <div className="col-span-2">
                    <span className="font-bold">Customer:</span> {completedSale.customer.name} ({completedSale.customer.phone})
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-slate-300 py-2">
                <div className="grid grid-cols-12 font-bold pb-1 text-slate-700">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {completedSale.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 text-slate-600">
                    <span className="col-span-6 truncate">{item.product?.name}</span>
                    <span className="col-span-2 text-center">{item.quantity}</span>
                    <span className="col-span-2 text-right">₹{item.unitPrice}</span>
                    <span className="col-span-2 text-right">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-[11px]">
                <div>
                  Subtotal: <span className="font-bold">₹{completedSale.subtotal}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="text-emerald-700">
                    Discount: -₹{completedSale.discount}
                  </div>
                )}
                <div className="text-sm font-extrabold text-slate-900 pt-1 border-t border-dashed border-slate-300">
                  Grand Total: ₹{completedSale.totalAmount}
                </div>
              </div>

              {/* Footer */}
              <p className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
                Thank you for shopping with us! • Items sold are non-refundable.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold"
              >
                Done / Next Sale
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PosPage;
