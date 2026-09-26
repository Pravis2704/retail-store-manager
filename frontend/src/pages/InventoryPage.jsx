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
  Boxes,
  History,
  SlidersHorizontal,
  Plus,
  Minus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  RotateCcw,
} from 'lucide-react';

const InventoryPage = () => {
  const { isStaff } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('INVENTORY'); // 'INVENTORY' | 'LEDGER'
  const [loading, setLoading] = useState(true);
  const [inventoryList, setInventoryList] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Stock Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustData, setAdjustData] = useState({
    quantity: '',
    transactionType: 'ADJUSTMENT',
    notes: '',
  });
  const [adjusting, setAdjusting] = useState(false);

  // Quick Reorder Modal State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderQty, setReorderQty] = useState('');
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'INVENTORY') {
        const res = await api.get('/inventory');
        setInventoryList(res.data);
      } else {
        const res = await api.get('/inventory/transactions');
        setTransactions(res.data);
      }
    } catch (err) {
      showToast('Error loading inventory data: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (inv) => {
    setSelectedProduct(inv);
    setAdjustData({
      quantity: '',
      transactionType: 'ADJUSTMENT',
      notes: '',
    });
    setAdjustModalOpen(true);
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustData.quantity || Number(adjustData.quantity) === 0) {
      showToast('Please enter a non-zero adjustment quantity', 'warning');
      return;
    }

    setAdjusting(true);
    try {
      await api.post(`/inventory/adjust/${selectedProduct.product._id}`, adjustData);
      showToast('Stock adjustment successfully recorded in audit ledger!', 'success');
      setAdjustModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Stock adjustment failed', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenQuickReorder = (inv) => {
    setSelectedProduct(inv);
    const recommended = Math.max(1, inv.maximumStock - inv.currentStock);
    setReorderQty(recommended);
    setReorderModalOpen(true);
  };

  const handleSubmitReorder = async (e) => {
    e.preventDefault();
    setReordering(true);
    try {
      await api.post('/reorders', {
        productId: selectedProduct.product._id,
        quantity: Number(reorderQty),
      });
      showToast('Purchase requisition successfully raised!', 'success');
      setReorderModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to raise reorder', 'error');
    } finally {
      setReordering(false);
    }
  };

  // Filter Inventory
  const filteredInventory = inventoryList.filter((item) => {
    const prod = item.product || {};
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch =
      !search ||
      prod.name?.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku?.toLowerCase().includes(search.toLowerCase()) ||
      prod.category?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter Transactions
  const filteredTransactions = transactions.filter((t) => {
    const prod = t.product || {};
    const matchesType = typeFilter === 'ALL' || t.transactionType === typeFilter;
    const matchesSearch =
      !search ||
      prod.name?.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku?.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceId?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Inventory & Stock Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace real-time stock balances, automatic replenishment triggers, and immutable audit logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('INVENTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'INVENTORY'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Stock On-Hand
          </button>
          {!isStaff && (
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LEDGER'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              Audit Movement Ledger
            </button>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Filter by product name, SKU, or reference..."
          className="w-full sm:w-80"
        />

        {activeTab === 'INVENTORY' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Statuses ({inventoryList.length})</option>
              <option value="NORMAL">Optimal Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Types</option>
              <option value="PURCHASE">PURCHASE (Inward)</option>
              <option value="SALE">SALE (Outward)</option>
              <option value="RETURN">RETURN</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="DAMAGE">DAMAGE</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: STOCK ON-HAND INVENTORY TABLE */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Product Name / SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Current Stock</th>
                  <th className="py-3.5 px-4 text-center">Reorder Threshold</th>
                  <th className="py-3.5 px-4 text-center">Max Capacity</th>
                  <th className="py-3.5 px-4">Health Status</th>
                  <th className="py-3.5 px-4">Last Restocked</th>
                  {!isStaff && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={!isStaff ? 8 : 7} className="py-8 text-center text-slate-400">
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((inv) => {
                    const prod = inv.product || {};
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{prod.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{prod.category}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-sm font-extrabold ${
                              inv.currentStock <= inv.reorderLevel ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {inv.currentStock} {prod.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-500">
                          {inv.reorderLevel}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">{inv.maximumStock}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {inv.lastRestockedAt
                            ? new Date(inv.lastRestockedAt).toLocaleDateString()
                            : 'Initial Stock'}
                        </td>
                        {!isStaff && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenAdjust(inv)}
                                title="Adjust Stock"
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => handleOpenQuickReorder(inv)}
                                title="Raise Reorder"
                                className="px-2.5 py-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Truck className="w-3 h-3" />
                                Reorder
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
      )}

      {/* TAB 2: STOCK MOVEMENT AUDIT LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4">Product Name / SKU</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Delta Units</th>
                  <th className="py-3.5 px-4 text-center">Stock Balance</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Performed By</th>
                  <th className="py-3.5 px-4">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      No stock transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const prod = tx.product || {};
                    const isPositive = tx.quantity > 0;

                    let badgeColor = 'bg-slate-100 text-slate-700';
                    if (tx.transactionType === 'PURCHASE') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (tx.transactionType === 'SALE') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    if (tx.transactionType === 'DAMAGE') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    if (tx.transactionType === 'RETURN') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                    return (
                      <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-slate-800">{prod.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {tx.previousStock} &rarr; <span className="font-bold text-slate-900">{tx.newStock}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-bold truncate max-w-[120px]">
                          {tx.referenceId || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-600">
                          {tx.performedBy?.name || 'System'}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-500 truncate max-w-[160px]">
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Adjust Stock: ${selectedProduct?.product?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitAdjust} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Current Stock Level:</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {selectedProduct?.currentStock} {selectedProduct?.product?.unit}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type *</label>
            <select
              value={adjustData.transactionType}
              onChange={(e) => setAdjustData({ ...adjustData, transactionType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ADJUSTMENT">Stock Audit Reconciliation (ADJUSTMENT)</option>
              <option value="DAMAGE">Damaged / Expired Goods (DAMAGE)</option>
              <option value="RETURN">Customer Return Restock (RETURN)</option>
              <option value="PURCHASE">Direct Supplier Purchase (PURCHASE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity Delta (+ or -) *
            </label>
            <input
              type="number"
              required
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
              placeholder="e.g. +10 to add, -5 to remove"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Positive values increase stock; negative values decrease stock.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
            <textarea
              rows={2}
              value={adjustData.notes}
              onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
              placeholder="e.g. Broken packaging discovered during weekly stock check"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjusting}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {adjusting ? 'Applying...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK REORDER MODAL */}
      <Modal
        isOpen={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        title={`Raise Purchase Requisition: ${selectedProduct?.product?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReorder} className="space-y-4">
          <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Stock:</span>
              <span className="font-bold text-slate-800">{selectedProduct?.currentStock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reorder Threshold:</span>
              <span className="font-bold text-slate-800">{selectedProduct?.reorderLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maximum Stock Capacity:</span>
              <span className="font-bold text-slate-800">{selectedProduct?.maximumStock}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reorder Quantity * (Recommended: {Math.max(1, (selectedProduct?.maximumStock || 0) - (selectedProduct?.currentStock || 0))})
            </label>
            <input
              type="number"
              min="1"
              required
              value={reorderQty}
              onChange={(e) => setReorderQty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReorderModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reordering}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {reordering ? 'Submitting...' : 'Submit Reorder Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
