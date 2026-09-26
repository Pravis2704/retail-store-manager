import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  Package,
  Plus,
  Edit2,
  Power,
  Filter,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';

const ProductsPage = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    category: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '',
    maximumStock: '',
    supplier: '',
    unit: 'pcs',
    initialStock: '10',
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadProductsData();
  }, []);

  const loadProductsData = async () => {
    try {
      setLoading(true);
      const [prodRes, supRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers'),
        api.get('/products/categories'),
      ]);
      setProducts(prodRes.data);
      setSuppliers(supRes.data.filter((s) => s.status === 'ACTIVE'));
      setCategories(catRes.data);
    } catch (err) {
      showToast('Error loading products: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      ...initialForm,
      supplier: suppliers[0]?._id || '',
    });
    setProductModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setIsEditing(true);
    setCurrentId(prod._id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      description: prod.description || '',
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      reorderLevel: prod.reorderLevel,
      maximumStock: prod.maximumStock,
      supplier: prod.supplier?._id || prod.supplier || '',
      unit: prod.unit || 'pcs',
      initialStock: prod.inventory?.currentStock || 0,
    });
    setProductModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (Number(formData.maximumStock) <= Number(formData.reorderLevel)) {
      showToast('Maximum stock must be greater than reorder level', 'warning');
      return;
    }

    if (Number(formData.costPrice) < 0 || Number(formData.sellingPrice) < 0) {
      showToast('Prices cannot be negative', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/products/${currentId}`, formData);
        showToast('Product updated successfully!', 'success');
      } else {
        await api.post('/products', formData);
        showToast('Product registered and inventory initialized!', 'success');
      }
      setProductModalOpen(false);
      loadProductsData();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (prod) => {
    try {
      const res = await api.patch(`/products/${prod._id}/toggle`);
      showToast(`Product '${prod.name}' is now ${res.data.isActive ? 'Active' : 'Deactivated'}`, 'success');
      setProducts(products.map((p) => (p._id === prod._id ? res.data : p)));
    } catch (err) {
      showToast(err.message || 'Failed to toggle product status', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner text="Loading product catalog..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Product Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SKU specifications, supplier assignments, reorder rules, and retail prices.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, SKU, or category..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">SKU / Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4 text-right">Cost (₹)</th>
                <th className="py-3.5 px-4 text-right">Selling (₹)</th>
                <th className="py-3.5 px-4 text-center">Stock / Thresholds</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = prod.inventory?.currentStock || 0;
                  const invStatus = prod.inventory?.status || 'OUT_OF_STOCK';

                  return (
                    <tr
                      key={prod._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !prod.isActive ? 'opacity-50 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{prod.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{prod.category}</td>
                      <td className="py-3.5 px-4 text-slate-500">{prod.unit}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        ₹{prod.costPrice}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{prod.sellingPrice}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <StatusBadge status={invStatus} className="text-[10px] py-0 px-2" />
                          <span className="font-bold text-slate-700">
                            {stock} / {prod.maximumStock}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Reorder at {prod.reorderLevel}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[140px]">
                        {prod.supplier?.name || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={prod.isActive ? 'ACTIVE' : 'INACTIVE'} className="text-[10px] py-0" />
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              title="Edit Product"
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(prod)}
                              title={prod.isActive ? 'Deactivate Product' : 'Activate Product'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                prod.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={isEditing ? 'Edit Product Specifications' : 'Onboard New Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Basmati Rice 5kg"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU (Unique Code) *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. RICE-ROYAL-5KG"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Grains & Staples"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="bag">Bag</option>
                <option value="carton">Carton</option>
                <option value="bottle">Bottle</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="liters">Liters</option>
                <option value="jar">Jar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="420"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="550"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level Threshold *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Alert triggers when stock drops to this level</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Stock Ceiling *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.maximumStock}
                onChange={(e) => setFormData({ ...formData, maximumStock: e.target.value })}
                placeholder="50"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Must be strictly greater than reorder level</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Supplier *</label>
              <select
                required
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Select a vendor...</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            {!isEditing && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="Initial units on-hand"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Register Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
