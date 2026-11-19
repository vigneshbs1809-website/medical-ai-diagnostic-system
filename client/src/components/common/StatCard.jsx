import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, badgeText, badgeType = 'neutral' }) {
  let badgeColor = 'bg-slate-100 text-slate-700';
  if (badgeType === 'danger') badgeColor = 'bg-red-50 text-red-700 border border-red-200';
  if (badgeType === 'success') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (badgeType === 'accent') badgeColor = 'bg-sky-50 text-sky-700 border border-sky-200';

  return (
    <div className="bg-white rounded-xl border border-medical-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-medical-secondary">
          {title}
        </p>
        {Icon && (
          <div className="p-2 rounded-lg bg-medical-accent-light text-medical-accent">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-medical-primary tracking-tight">
          {value}
        </h3>
        {badgeText && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-medical-secondary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
