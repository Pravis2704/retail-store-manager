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
  Receipt,
  Eye,
  RotateCcw,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Filter,
} from 'lucide-react';

const SalesPage = () => {
  const { isStaff, isAdmin, isManager } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Details Modal State
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Cancel Sale Confirmation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      showToast('Failed to load sales history: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (sale) => {
    setSelectedSale(sale);
    setDetailsModalOpen(true);
  };

  const handleOpenCancel = (sale) => {
    setSaleToCancel(sale);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!saleToCancel) return;
    setCancelling(true);
    try {
      await api.patch(`/sales/${saleToCancel._id}/cancel`, { reason: cancelReason });
      showToast(`Sale #${saleToCancel.saleNumber} cancelled and stock restored to inventory.`, 'success');
      setCancelModalOpen(false);
      loadSales();
    } catch (err) {
      showToast(err.message || 'Failed to cancel sale', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchesPayment = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;
    const matchesSearch =
      !search ||
      s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.phone?.toLowerCase().includes(search.toLowerCase());
    return matchesPayment && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner text="Retrieving sales transactions..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Sales History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStaff
              ? 'Review your completed checkout transactions and reprint invoices.'
              : 'Audit all point-of-sale customer receipts, tenders, and cancellation rollbacks.'}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by invoice #, customer name or phone..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="ALL">All Payment Methods ({sales.length})</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
          </select>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Invoice # / Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Subtotal (₹)</th>
                <th className="py-3.5 px-4 text-right">Discount (₹)</th>
                <th className="py-3.5 px-4 text-right">Net Paid (₹)</th>
                <th className="py-3.5 px-4">Tender</th>
                <th className="py-3.5 px-4">Cashier</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No sales records found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800">{sale.saleNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {sale.customer ? (
                        <>
                          <div className="font-bold text-slate-800">{sale.customer.name}</div>
                          <div className="text-[10px] text-slate-400">{sale.customer.phone}</div>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium italic">Walk-in Guest</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {sale.items?.length || 0}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                      ₹{sale.subtotal}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      {sale.discount > 0 ? `-₹${sale.discount}` : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      ₹{sale.totalAmount}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        {sale.paymentMethod === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                        {sale.paymentMethod === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                        {sale.paymentMethod === 'UPI' && <Smartphone className="w-3.5 h-3.5 text-purple-600" />}
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {sale.soldBy?.name || 'Cashier'}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={sale.status} className="text-[10px] py-0" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(sale)}
                          title="View Invoice Receipt"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isStaff && sale.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenCancel(sale)}
                            title="Cancel Sale & Restore Stock"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALE DETAILS / INVOICE MODAL */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Invoice Breakdown: #${selectedSale?.saleNumber}`}
        maxWidth="max-w-lg"
      >
        {selectedSale && (
          <div className="space-y-4 text-slate-800 font-mono text-xs">
            <div className="border border-dashed border-slate-300 p-5 rounded-2xl bg-slate-50/50 space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="text-base font-extrabold uppercase tracking-wider font-sans">
                  Retail Store Manager
                </h2>
                <p className="text-[11px] text-slate-500">Official POS Tax Invoice</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold">Invoice:</span> {selectedSale.saleNumber}
                </div>
                <div className="text-right">
                  <span className="font-bold">Date:</span>{' '}
                  {new Date(selectedSale.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-bold">Cashier:</span> {selectedSale.soldBy?.name}
                </div>
                <div className="text-right">
                  <span className="font-bold">Payment:</span> {selectedSale.paymentMethod}
                </div>
                {selectedSale.customer && (
                  <div className="col-span-2">
                    <span className="font-bold">Customer:</span> {selectedSale.customer.name} (
                    {selectedSale.customer.phone})
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2">
                <div className="grid grid-cols-12 font-bold pb-1 text-slate-700">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 text-slate-600">
                    <span className="col-span-6 truncate">{item.product?.name}</span>
                    <span className="col-span-2 text-center">{item.quantity}</span>
                    <span className="col-span-2 text-right">₹{item.unitPrice}</span>
                    <span className="col-span-2 text-right">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right text-[11px]">
                <div>
                  Subtotal: <span className="font-bold">₹{selectedSale.subtotal}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="text-emerald-700">
                    Discount: -₹{selectedSale.discount}
                  </div>
                )}
                <div className="text-sm font-extrabold text-slate-900 pt-1 border-t border-dashed border-slate-300">
                  Total Paid: ₹{selectedSale.totalAmount}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CANCEL SALE CONFIRMATION MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Sale #${saleToCancel?.saleNumber}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Cancelling this sale will mark its status as <span className="font-bold text-rose-600">CANCELLED</span>, restore the sold quantities back into live inventory, and generate a <span className="font-bold">RETURN</span> stock audit log.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer returned items, cashier error"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              Back
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50"
            >
              {cancelling ? 'Restoring Stock...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalesPage;
