import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleBadge from '../components/RoleBadge';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  Store,
  ChevronDown,
} from 'lucide-react';

const AppLayout = () => {
  const { user, logout, quickSwitch, role, isAdmin, isManager, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switchDropdownOpen, setSwitchDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (targetRole) => {
    setSwitchDropdownOpen(false);
    await quickSwitch(targetRole);
    // If switching to sales staff from reports, navigate to POS
    if (targetRole === 'SALES_STAFF' && (location.pathname.startsWith('/reports') || location.pathname.startsWith('/users'))) {
      navigate('/pos');
    }
  };

  // Navigation Items with RBAC visibility rules
  const navItems = [
    {
      name: 'POS Terminal',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
      highlight: true,
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
    },
    {
      name: 'Sales History',
      path: '/sales',
      icon: Receipt,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
    },
    {
      name: 'Products Catalog',
      path: '/products',
      icon: Package,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
    },
    {
      name: 'Inventory & Ledger',
      path: '/inventory',
      icon: Boxes,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
    },
    {
      name: 'Reorders & Approvals',
      path: '/reorders',
      icon: Truck,
      roles: ['ADMIN', 'MANAGER'], // Sales staff strictly restricted
    },
    {
      name: 'Customers CRM',
      path: '/customers',
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'SALES_STAFF'],
    },
    {
      name: 'Suppliers',
      path: '/suppliers',
      icon: Building2,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      roles: ['ADMIN', 'MANAGER'], // Sales staff restricted
    },
    {
      name: 'User Management',
      path: '/users',
      icon: UserCog,
      roles: ['ADMIN'], // Admin only
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                Retail-Manager
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Software
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  item.highlight && !isActive
                    ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20 hover:bg-brand-600/20'
                    : isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400'}`} />
                <span className="flex-1">{item.name}</span>
                {item.highlight && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                    POS
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Current User & Role Status Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-brand-400 border border-slate-700">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <RoleBadge role={role} showIcon={false} className="mt-1 text-[10px] py-0" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Store System Online</span>
            </div>
          </div>

          {/* Quick Role Switcher for Campus Evaluator Demo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitchDropdownOpen(!switchDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors shadow-sm"
              >
                <span className="text-slate-400 hidden md:inline">Demo Switcher:</span>
                <RoleBadge role={role} showIcon={false} className="py-0 text-[10px]" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {switchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Test Account
                  </div>
                  <button
                    onClick={() => handleQuickSwitch('ADMIN')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      isAdmin ? 'font-bold text-purple-700 bg-purple-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>Store Admin</span>
                    <RoleBadge role="ADMIN" showIcon={false} className="text-[10px] py-0" />
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('MANAGER')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      isManager ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>Shift Manager</span>
                    <RoleBadge role="MANAGER" showIcon={false} className="text-[10px] py-0" />
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('SALES_STAFF')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      isStaff ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>POS Cashier</span>
                    <RoleBadge role="SALES_STAFF" showIcon={false} className="text-[10px] py-0" />
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
