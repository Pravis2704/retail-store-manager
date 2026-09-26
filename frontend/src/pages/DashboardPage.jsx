import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  TrendingUp,
  BarChart2,
  PieChart,
  ShieldAlert,
} from 'lucide-react';

const DashboardPage = () => {
  const { role, isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, trendsRes, topRes, catRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/sales-trends?days=7'),
        api.get('/dashboard/top-products?limit=5'),
        api.get('/dashboard/sales-by-category'),
      ]);

      setSummary(sumRes.data);
      setSalesTrends(trendsRes.data);
      setTopProducts(topRes.data);
      setCategorySales(catRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Aggregating store intelligence from database..." size="lg" />;
  }

  const kpis = summary?.kpis || {};
  const alerts = summary?.alerts || {};

  // Maximum value for SVG chart scaling
  const maxRevenueTrend = Math.max(...salesTrends.map((t) => t.revenue), 1000);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time store metrics, inventory replenishment alerts, and operational signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Open POS Terminal
          </Link>
        </div>
      </div>

      {/* Critical Operational Alerts */}
      {(alerts.lowStockMessage || alerts.pendingReordersMessage) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.lowStockMessage && (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Low Stock Attention
                  </h4>
                  <p className="text-sm font-medium text-amber-800 mt-0.5">{alerts.lowStockMessage}</p>
                </div>
              </div>
              <Link
                to="/inventory"
                className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 shrink-0 self-center bg-amber-200/60 px-2.5 py-1.5 rounded-lg"
              >
                Inspect <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {alerts.pendingReordersMessage && (
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Pending Purchase Orders
                  </h4>
                  <p className="text-sm font-medium text-blue-800 mt-0.5">{alerts.pendingReordersMessage}</p>
                </div>
              </div>
              {!isStaff ? (
                <Link
                  to="/reorders"
                  className="text-xs font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 shrink-0 self-center bg-blue-200/60 px-2.5 py-1.5 rounded-lg"
                >
                  Review <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="text-xs font-medium text-blue-600 self-center">Awaiting Manager</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              ₹{kpis.todayRevenue?.toLocaleString('en-IN') || 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Sales Captured
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Sales Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sales Today</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              {kpis.totalSalesToday || 0}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Transactions completed</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Low & Out of Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stock Deficits</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">{kpis.lowStockCount || 0}</span>
              <span className="text-xs text-slate-400">low</span>
              <span className="text-2xl font-extrabold text-rose-600 ml-1">{kpis.outOfStockCount || 0}</span>
              <span className="text-xs text-slate-400">zero</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Require replenishment</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Catalog & Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Inventory</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              {kpis.totalProducts || 0}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Across {kpis.totalCustomers || 0} Customers
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend (Custom clean SVG bar chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-800">Sales & Revenue Trend (Last 7 Days)</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Daily Totals (₹)</span>
          </div>

          <div className="flex-1 flex items-end gap-3 pt-6 pb-2 h-52">
            {salesTrends.map((trend) => {
              const heightPercent = Math.max(8, (trend.revenue / maxRevenueTrend) * 100);
              return (
                <div key={trend.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{trend.revenue}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-lg transition-all group-hover:from-brand-700 group-hover:to-brand-500 relative"
                  />
                  <div className="text-[10px] font-semibold text-slate-400 mt-1 text-center truncate w-full">
                    {trend.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory Health Ratio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-800">Stock Health Distribution</h3>
            </div>
          </div>

          <div className="space-y-4 my-auto">
            {summary?.inventoryStatusBreakdown?.map((item) => {
              const totalInv = (kpis.normalStockCount || 0) + (kpis.lowStockCount || 0) + (kpis.outOfStockCount || 0) || 1;
              const pct = Math.round((item.count / totalInv) * 100);

              let barColor = 'bg-emerald-500';
              if (item.status === 'LOW_STOCK') barColor = 'bg-amber-500';
              if (item.status === 'OUT_OF_STOCK') barColor = 'bg-rose-500';

              return (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="text-slate-800">
                      {item.count} items ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              to="/inventory"
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center justify-between"
            >
              <span>Manage Store Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tables Row: Top Selling Products & Category Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Top Velocity Products
            </h3>
            <Link to="/sales" className="text-xs font-medium text-brand-600 hover:underline">
              View All Sales
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No sales transactions logged yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.sku} • {p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">₹{p.totalRevenue?.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{p.totalQuantitySold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Sales Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Revenue by Category
            </h3>
            <Link to="/reports" className="text-xs font-medium text-brand-600 hover:underline">
              Detailed Reports
            </Link>
          </div>

          {categorySales.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No category sales data yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {categorySales.map((cat) => (
                <div key={cat.category} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-xs font-bold text-slate-800">{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800">
                      ₹{cat.revenue?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">({cat.itemsSold} units)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
