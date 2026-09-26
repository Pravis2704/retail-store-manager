import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Boxes,
  History,
  Truck,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

const ReportsPage = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('SALES'); // 'SALES' | 'INVENTORY' | 'MOVEMENTS' | 'REORDERS'
  const [loading, setLoading] = useState(true);

  // Sales Report State
  const [salesPeriod, setSalesPeriod] = useState('today');
  const [salesData, setSalesData] = useState(null);

  // Inventory Report State
  const [inventoryReport, setInventoryReport] = useState(null);

  // Movements Report State
  const [movements, setMovements] = useState([]);
  const [movementType, setMovementType] = useState('');

  // Reorders Report State
  const [reordersList, setReordersList] = useState([]);

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, salesPeriod, movementType]);

  const loadActiveReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'SALES') {
        const res = await api.get(`/reports/sales?period=${salesPeriod}`);
        setSalesData(res.data);
      } else if (activeTab === 'INVENTORY') {
        const res = await api.get('/reports/inventory');
        setInventoryReport(res.data);
      } else if (activeTab === 'MOVEMENTS') {
        const query = movementType ? `?transactionType=${movementType}` : '';
        const res = await api.get(`/reports/stock-movements${query}`);
        setMovements(res.data);
      } else if (activeTab === 'REORDERS') {
        const res = await api.get('/reports/reorders');
        setReordersList(res.data);
      }
    } catch (err) {
      showToast('Error loading report: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Financial & Inventory Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit store performance, stock valuation, inventory movements, and vendor fulfillment.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          Print Official Report
        </button>
      </div>

      {/* Report Category Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('SALES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'SALES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Sales & Revenue Report
        </button>

        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'INVENTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Valuation Report
        </button>

        <button
          onClick={() => setActiveTab('MOVEMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'MOVEMENTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Stock Movement Ledger
        </button>

        <button
          onClick={() => setActiveTab('REORDERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'REORDERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          Reorder Fulfillment Report
        </button>
      </div>

      {/* 1. SALES REPORT TAB */}
      {activeTab === 'SALES' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-2 bg-white p-3 px-4 rounded-2xl border border-slate-200/80 shadow-sm self-start sm:w-fit">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Period:</span>
            <div className="flex gap-1">
              {[
                { label: 'Today', value: 'today' },
                { label: 'Past 7 Days', value: 'week' },
                { label: 'Past 30 Days', value: 'month' },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSalesPeriod(p.value)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    salesPeriod === p.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Calculating revenue metrics..." />
          ) : (
            <>
              {/* Sales KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales</p>
                  <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                    ₹{salesData?.summary?.grossRevenue?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Before discounts</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discounts Given</p>
                  <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                    ₹{salesData?.summary?.totalDiscount?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Store promotions</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Revenue</p>
                  <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                    ₹{salesData?.summary?.netRevenue?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">Captured in drawer</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Orders</p>
                  <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                    {salesData?.summary?.totalSales || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Paid receipts</p>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payment Method Share:
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                    Cash: ₹{salesData?.summary?.paymentBreakdown?.CASH || 0}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl">
                    Card: ₹{salesData?.summary?.paymentBreakdown?.CARD || 0}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl">
                    UPI: ₹{salesData?.summary?.paymentBreakdown?.UPI || 0}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 text-center">Items Sold</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right">Net Amount</th>
                        <th className="py-3 px-4">Tender</th>
                        <th className="py-3 px-4">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesData?.sales?.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.saleNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(s.createdAt).toLocaleTimeString()}</td>
                          <td className="py-3 px-4 text-slate-700">{s.customer?.name || 'Walk-in'}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">{s.items?.length || 0}</td>
                          <td className="py-3 px-4 text-right text-slate-500">₹{s.subtotal}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{s.totalAmount}</td>
                          <td className="py-3 px-4 font-bold">{s.paymentMethod}</td>
                          <td className="py-3 px-4 text-slate-600">{s.soldBy?.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. INVENTORY VALUATION TAB */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          {loading ? (
            <LoadingSpinner text="Computing inventory valuation metrics..." />
          ) : (
            <>
              {/* Valuation KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Cost Value</p>
                  <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                    ₹{inventoryReport?.summary?.totalCostValuation?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Capital invested in stock</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retail Sales Potential</p>
                  <h3 className="text-xl font-extrabold text-brand-600 mt-1">
                    ₹{inventoryReport?.summary?.totalRetailValuation?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">At retail selling prices</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Projected Gross Margin</p>
                  <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                    ₹{inventoryReport?.summary?.projectedMargin?.toLocaleString('en-IN') || 0}
                  </h3>
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">Potential gross earnings</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Units In Warehouse</p>
                  <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                    {inventoryReport?.summary?.totalUnitsInStock || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Across {inventoryReport?.summary?.totalProductsCount || 0} catalog SKUs
                  </p>
                </div>
              </div>

              {/* Valuation Breakdown Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Product Name / SKU</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Stock</th>
                        <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                        <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                        <th className="py-3 px-4 text-right">Cost Valuation (₹)</th>
                        <th className="py-3 px-4 text-right">Retail Potential (₹)</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryReport?.records?.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{r.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{r.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{r.category}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {r.currentStock} {r.unit}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 font-medium">₹{r.costPrice}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">₹{r.sellingPrice}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            ₹{r.costValuation?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-brand-700">
                            ₹{r.retailValuation?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={r.status} className="text-[10px] py-0" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. STOCK MOVEMENTS LEDGER TAB */}
      {activeTab === 'MOVEMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white p-3 px-4 rounded-2xl border border-slate-200/80 shadow-sm w-fit">
            <span className="text-xs font-bold text-slate-700">Transaction Type:</span>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="">All Types ({movements.length})</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="SALE">SALE</option>
              <option value="RETURN">RETURN</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="DAMAGE">DAMAGE</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100 font-sans">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Delta</th>
                    <th className="py-3 px-4 text-center">Balance</th>
                    <th className="py-3 px-4">Ref Code</th>
                    <th className="py-3 px-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {movements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-800">{m.product?.name}</td>
                      <td className="py-3 px-4 font-sans font-bold">{m.transactionType}</td>
                      <td className={`py-3 px-4 text-right font-extrabold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {m.previousStock} &rarr; <span className="font-bold text-slate-900">{m.newStock}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">{m.referenceId || '-'}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{m.performedBy?.name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. REORDERS REPORT TAB */}
      {activeTab === 'REORDERS' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Requisition #</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-center">Ordered</th>
                  <th className="py-3 px-4 text-center">Received</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Approver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reordersList.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{ord.requestNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{ord.product?.name}</td>
                    <td className="py-3 px-4 text-slate-600">{ord.supplier?.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-brand-600">{ord.recommendedQuantity}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">{ord.receivedQuantity || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={ord.status} className="text-[10px] py-0" />
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{ord.approvedBy?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
