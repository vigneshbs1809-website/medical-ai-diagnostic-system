import React from 'react';

export default function StatusBadge({ status, label, size = 'md' }) {
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';

  const normalized = (status || label || '').toLowerCase();

  if (normalized.includes('b-all') || normalized.includes('danger') || normalized.includes('suspected') || normalized.includes('high') || normalized.includes('offline')) {
    bg = 'bg-red-50 text-red-700 border-red-200';
  } else if (normalized.includes('normal') || normalized.includes('healthy') || normalized.includes('success') || normalized.includes('low') || normalized.includes('ready')) {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normalized.includes('degraded') || normalized.includes('warning') || normalized.includes('pending')) {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normalized.includes('info') || normalized.includes('analyzing')) {
    bg = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5 font-semibold'
    : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        normalized.includes('danger') || normalized.includes('b-all') || normalized.includes('suspected') || normalized.includes('offline')
          ? 'bg-red-500'
          : normalized.includes('normal') || normalized.includes('healthy') || normalized.includes('ready')
          ? 'bg-emerald-500'
          : 'bg-amber-500'
      }`} />
      {label || status}
    </span>
  );
}
