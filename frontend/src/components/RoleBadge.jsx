import React from 'react';
import { ShieldCheck, UserCheck, ShoppingBag } from 'lucide-react';

const roleConfig = {
  ADMIN: {
    bg: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: ShieldCheck,
    label: 'Admin',
  },
  MANAGER: {
    bg: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: UserCheck,
    label: 'Manager',
  },
  SALES_STAFF: {
    bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: ShoppingBag,
    label: 'Sales Staff',
  },
};

const RoleBadge = ({ role, showIcon = true, className = '' }) => {
  const config = roleConfig[role] || {
    bg: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: UserCheck,
    label: role,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {config.label}
    </span>
  );
};

export default RoleBadge;
