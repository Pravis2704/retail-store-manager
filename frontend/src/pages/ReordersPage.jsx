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
  Truck,
  Plus,
  CheckCircle,
  XCircle,
  PackageCheck,
  Calendar,
  Building2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Zap,
} from 'lucide-react';

const ReordersPage = () => {
  const { isStaff } = useAuth();
  const { showToast } = useToast();

  const [mainTab, setMainTab] = useState('ORDERS'); // 'ORDERS' | 'AI_ADVISOR'
  const [loading, setLoading] = useState(true);
  const [reorders, setReorders] = useState([]);
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Action Modals State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [newReorderModalOpen, setNewReorderModalOpen] = useState(false);
  const [selectedReorder, setSelectedReorder] = useState(null);

  const [rejectionReason, setRejectionReason] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // New Reorder Form
  const [newReorderData, setNewReorderData] = useState({
    productId: '',
    quantity: '',
  });

  useEffect(() => {
    loadReorders();
    if (mainTab === 'AI_ADVISOR') {
      loadAiRecommendations();
    }
  }, [mainTab]);

  const loadReorders = async () => {
    try {
      setLoading(true);
      const [reorderRes, prodRes] = await Promise.all([
        api.get('/reorders'),
        api.get('/products'),
      ]);
      setReorders(reorderRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      showToast('Error loading reorders: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAiRecommendations = async () => {
    try {
      setLoadingAi(true);
      const res = await api.get('/reorders/ai-recommendations');
      setRecommendations(res.data);
    } catch (err) {
      showToast('Failed to generate AI recommendations: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleQuickAiOrder = async (rec) => {
    try {
      await api.post('/reorders', {
        productId: rec.product._id,
        quantity: rec.smartRecommendedQuantity,
      });
      showToast(`Purchase requisition raised for ${rec.smartRecommendedQuantity} units of '${rec.product.name}'!`, 'success');
      loadAiRecommendations();
      loadReorders();
    } catch (err) {
      showToast(err.message || 'Failed to raise reorder', 'error');
    }
  };

  // 1. Approve Reorder
  const handleApprove = async (reorder) => {
    try {
      await api.patch(`/reorders/${reorder._id}/approve`);
      showToast(`Purchase requisition #${reorder.requestNumber} approved!`, 'success');
      loadReorders();
    } catch (err) {
      showToast(err.message || 'Failed to approve reorder', 'error');
    }
  };

  // 2. Reject Reorder
  const handleOpenReject = (reorder) => {
    setSelectedReorder(reorder);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast('A reason is required to reject an order', 'warning');
      return;
    }

    setSubmittingAction(true);
    try {
      await api.patch(`/reorders/${selectedReorder._id}/reject`, { reason: rejectionReason });
      showToast(`Reorder #${selectedReorder.requestNumber} rejected`, 'success');
      setRejectModalOpen(false);
      loadReorders();
    } catch (err) {
      showToast(err.message || 'Failed to reject reorder', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Receive Goods & Replenish Stock
  const handleOpenReceive = (reorder) => {
    setSelectedReorder(reorder);
    setReceivedQty(reorder.recommendedQuantity || '');
    setReceiveModalOpen(true);
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    const qty = Number(receivedQty);
    if (isNaN(qty) || qty <= 0) {
      showToast('Received quantity must be greater than zero', 'warning');
      return;
    }

    setSubmittingAction(true);
    try {
      await api.patch(`/reorders/${selectedReorder._id}/receive`, { receivedQuantity: qty });
      showToast(
        `Goods received! ${qty} units replenished into inventory and marked COMPLETED.`,
        'success'
      );
      setReceiveModalOpen(false);
      loadReorders();
    } catch (err) {
      showToast(err.message || 'Failed to receive goods', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Create Manual Reorder
  const handleCreateReorder = async (e) => {
    e.preventDefault();
    if (!newReorderData.productId) {
      showToast('Please select a product', 'warning');
      return;
    }

    setSubmittingAction(true);
    try {
      await api.post('/reorders', {
        productId: newReorderData.productId,
        quantity: newReorderData.quantity ? Number(newReorderData.quantity) : undefined,
      });
      showToast('Reorder request raised successfully!', 'success');
      setNewReorderModalOpen(false);
      setNewReorderData({ productId: '', quantity: '' });
      loadReorders();
    } catch (err) {
      showToast(err.message || 'Failed to raise reorder', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredReorders = reorders.filter((r) => {
    const prod = r.product || {};
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      !search ||
      r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      prod.name?.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner text="Loading purchase requisitions..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Purchase Reorders & Replenishment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review low-stock order requisitions, manager approvals, and inward goods receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Main Tab Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setMainTab('ORDERS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'ORDERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Requisitions
            </button>
            <button
              onClick={() => setMainTab('AI_ADVISOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'AI_ADVISOR' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              AI Reorder Advisor
            </button>
          </div>

          <button
            onClick={() => setNewReorderModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Raise Requisition
          </button>
        </div>
      </div>

      {mainTab === 'ORDERS' ? (
        <>
          {/* Status Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by order #, product name, or SKU..."
              className="w-full sm:w-80"
            />

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st} {st === 'PENDING' && reorders.filter((r) => r.status === 'PENDING').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                      {reorders.filter((r) => r.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reorders Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Order # / Date</th>
                    <th className="py-3.5 px-4">Product Name / SKU</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-center">Stock Snapshot</th>
                    <th className="py-3.5 px-4 text-center">Requested Qty</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Workflow Personnel</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReorders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No reorder requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredReorders.map((order) => {
                      const prod = order.product || {};
                      const isPending = order.status === 'PENDING';
                      const isApproved = order.status === 'APPROVED';

                      return (
                        <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-800">{order.requestNumber}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{prod.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700">{order.supplier?.name}</div>
                            <div className="text-[10px] text-slate-400">{order.supplier?.phone}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="text-xs font-extrabold text-amber-600">
                              {order.currentStock}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">
                              / {order.maximumStock} max
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="text-sm font-extrabold text-brand-600">
                              {order.recommendedQuantity} {prod.unit || 'units'}
                            </span>
                            {order.receivedQuantity > 0 && (
                              <div className="text-[10px] text-emerald-600 font-bold">
                                Received: {order.receivedQuantity}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge status={order.status} />
                            {order.status === 'REJECTED' && order.rejectionReason && (
                              <p className="text-[10px] text-rose-600 mt-1 max-w-[140px] truncate" title={order.rejectionReason}>
                                Reason: {order.rejectionReason}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            <div>Req: <span className="text-slate-700 font-medium">{order.requestedBy?.name || 'System Auto'}</span></div>
                            {order.approvedBy && (
                              <div>Review: <span className="text-slate-700 font-medium">{order.approvedBy.name}</span></div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApprove(order)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleOpenReject(order)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <button
                                  onClick={() => handleOpenReceive(order)}
                                  className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  Receive Goods
                                </button>
                              )}

                              {!isPending && !isApproved && (
                                <span className="text-[11px] text-slate-400 font-medium italic">
                                  Processed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* AI ADVISOR TAB CONTENT */
        <div className="space-y-6">
          {/* Smart Advisor Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Smart Inventory Intelligence
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  Velocity-Aware Reorder Recommendations
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Calculates purchase quantities using: (Daily Consumption × Supplier Lead Time) + Safety Buffer, capped at maximum warehouse capacity.
                </p>
              </div>

              <button
                onClick={loadAiRecommendations}
                disabled={loadingAi}
                className="px-4 py-2 bg-white text-slate-900 hover:bg-brand-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start md:self-auto shrink-0 shadow-md"
              >
                <Zap className="w-3.5 h-3.5 text-brand-600" />
                {loadingAi ? 'Recalculating...' : 'Refresh Velocity'}
              </button>
            </div>
          </div>

          {loadingAi ? (
            <LoadingSpinner text="Running demand forecast and supplier lead time simulations..." size="lg" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec) => {
                const isCritical = rec.urgency === 'CRITICAL';
                const isHigh = rec.urgency === 'HIGH';

                let cardBorder = 'border-slate-200';
                let tagColor = 'bg-slate-100 text-slate-700';
                if (isCritical) {
                  cardBorder = 'border-rose-300 bg-rose-50/20';
                  tagColor = 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (isHigh) {
                  cardBorder = 'border-amber-300 bg-amber-50/20';
                  tagColor = 'bg-amber-100 text-amber-800 border-amber-200';
                }

                return (
                  <div
                    key={rec.product._id}
                    className={`bg-white rounded-3xl border ${cardBorder} p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                            {rec.product.sku}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {rec.product.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {rec.product.category} • Vendor: {rec.supplier?.name || 'N/A'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor} shrink-0`}>
                          {rec.urgency}
                        </span>
                      </div>

                      {/* Velocity Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-2xl text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">Current</p>
                          <p className={`text-xs font-extrabold ${rec.currentStock <= rec.reorderLevel ? 'text-amber-600' : 'text-slate-800'}`}>
                            {rec.currentStock} {rec.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">Velocity</p>
                          <p className="text-xs font-extrabold text-brand-600">
                            {rec.avgDailySales} /day
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">Stockout In</p>
                          <p className={`text-xs font-extrabold ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                            {rec.projectedDaysToStockout} days
                          </p>
                        </div>
                      </div>

                      {/* AI Rationale */}
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">AI Rationale: </span>
                        {rec.reasoning}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Recommended Order</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          {rec.smartRecommendedQuantity} {rec.product.unit}
                        </p>
                      </div>

                      {rec.hasPendingReorder ? (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Order
                        </span>
                      ) : (
                        <button
                          onClick={() => handleQuickAiOrder(rec)}
                          className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Order {rec.smartRecommendedQuantity} Units
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REJECT MODAL */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject Reorder Requisition #${selectedReorder?.requestNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReject} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-700 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Please provide a justified business rationale for rejecting this stock replenishment. Inventory counts will remain unchanged.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Supplier confirmed temporary out-of-stock; replacement SKU being procured next week."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50"
            >
              {submittingAction ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECEIVE GOODS MODAL */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title={`Inward Goods Receipt: #${selectedReorder?.requestNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReceive} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
            <p className="font-bold">Product: {selectedReorder?.product?.name}</p>
            <p>Supplier: {selectedReorder?.supplier?.name}</p>
            <p>Ordered Quantity: <span className="font-extrabold">{selectedReorder?.recommendedQuantity} units</span></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Physically Verified Quantity Received *
            </label>
            <input
              type="number"
              min="1"
              required
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Entering this quantity will immediately increment live inventory, log a PURCHASE audit entry, and mark this reorder COMPLETED.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReceiveModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingAction ? 'Replenishing...' : 'Verify & Replenish Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RAISE REORDER MODAL */}
      <Modal
        isOpen={newReorderModalOpen}
        onClose={() => setNewReorderModalOpen(false)}
        title="Raise Manual Purchase Requisition"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateReorder} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Product *</label>
            <select
              required
              value={newReorderData.productId}
              onChange={(e) => setNewReorderData({ ...newReorderData, productId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">Choose item to reorder...</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Stock: {p.inventory?.currentStock || 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Custom Quantity (Optional — Leave blank for auto max stock formula)
            </label>
            <input
              type="number"
              min="1"
              value={newReorderData.quantity}
              onChange={(e) => setNewReorderData({ ...newReorderData, quantity: e.target.value })}
              placeholder="Auto-calculated (Maximum - Current)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewReorderModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {submittingAction ? 'Submitting...' : 'Submit Reorder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReordersPage;
