import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

// Stat Card
export const StatCard = ({ title, value, sub, icon: Icon, color = 'blue', onClick }) => {
  const colors = {
    blue: 'from-blue-600/20 to-blue-800/10 border-blue-500/20 text-blue-400',
    green: 'from-green-600/20 to-green-800/10 border-green-500/20 text-green-400',
    yellow: 'from-yellow-600/20 to-yellow-800/10 border-yellow-500/20 text-yellow-400',
    red: 'from-red-600/20 to-red-800/10 border-red-500/20 text-red-400',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-500/20 text-purple-400',
    orange: 'from-orange-600/20 to-orange-800/10 border-orange-500/20 text-orange-400',
    cyan: 'from-cyan-600/20 to-cyan-800/10 border-cyan-500/20 text-cyan-400',
    slate: 'from-slate-600/20 to-slate-800/10 border-slate-500/20 text-slate-400',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">{title}</p>
          <p className="text-xl font-bold text-white mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-white/5 ml-2 shrink-0`}>
            <Icon size={20} className={colors[color].split(' ').find(c => c.startsWith('text-'))} />
          </div>
        )}
      </div>
    </div>
  );
};

// Modal
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-gray-900 border border-gray-700/50 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">{children}</div>
      </div>
    </div>
  );
};

// Toast
export const Toast = ({ toast }) => {
  if (!toast) return null;
  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-yellow-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };
  const colors = {
    success: 'border-green-500/30 bg-green-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
  };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[toast.type]} backdrop-blur-sm shadow-2xl animate-slide-down max-w-sm w-full mx-4`}>
      {icons[toast.type]}
      <span className="text-sm text-white font-medium">{toast.message}</span>
    </div>
  );
};

// Form Input
export const FormInput = ({ label, type = 'text', value, onChange, placeholder, required, className = '', ...rest }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm transition-colors"
      {...rest}
    />
  </div>
);

// Form Select
export const FormSelect = ({ label, value, onChange, options, required, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm transition-colors"
    >
      {options.map(opt => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
      ))}
    </select>
  </div>
);

// Form Textarea
export const FormTextarea = ({ label, value, onChange, placeholder, rows = 3, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm transition-colors resize-none"
    />
  </div>
);

// Button
export const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', disabled, type = 'button', fullWidth }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white border-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    outline: 'bg-transparent hover:bg-gray-800 text-gray-300 border-gray-600',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-400 border-transparent',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} font-medium rounded-lg border transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
};

// Status Badge
export const StatusBadge = ({ status }) => {
  const colors = {
    'Pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'In Production': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Completed': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Delivered': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Cancelled': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Running': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Maintenance': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Stopped': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Active': 'bg-green-500/20 text-green-300 border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {status}
    </span>
  );
};

// Section Header
export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// Empty State
export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {Icon && <Icon size={48} className="text-gray-600 mb-3" />}
    <p className="text-gray-400 font-medium">{title}</p>
    {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
  </div>
);

// Loading Skeleton
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded-lg ${className}`} />
);

// Card
export const Card = ({ children, className = '' }) => (
  <div className={`bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

// Info Row
export const InfoRow = ({ label, value, valueClass = 'text-white' }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-0">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
  </div>
);
