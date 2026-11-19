import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Microscope,
  Target,
  History,
  FileText,
  Binary,
  Settings as SettingsIcon,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useBackend } from '../../context/BackendContext';

export default function Sidebar() {
  const { leukemiaReady, myelomaReady, isOnline } = useBackend();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/leukemia', label: 'Leukemia Classification', icon: Microscope, badge: leukemiaReady ? 'Ready' : null },
    { to: '/myeloma', label: 'Multiple Myeloma Detection', icon: Target, badge: myelomaReady ? 'Ready' : null },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/models', label: 'Model Information', icon: Binary },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-medical-border flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-medical-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-medical-primary flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-medical-primary tracking-tight">MED-AI DIAGNOSTICS</div>
            <div className="text-[11px] text-medical-secondary font-medium">Hematology Decision Suite</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-medical-secondary">
          Clinical Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-medical-accent-light text-medical-primary font-semibold border-l-4 border-medical-accent shadow-sm'
                    : 'text-medical-text hover:bg-slate-50 hover:text-medical-primary'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-medical-accent" />
                <span>{item.label}</span>
              </div>
              {item.badge && isOnline && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Compliance & Version Info */}
      <div className="p-4 border-t border-medical-border bg-medical-bg m-3 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-medical-primary mb-1">
          <ShieldCheck className="w-4 h-4 text-medical-success" />
          <span>Research Platform v1.0</span>
        </div>
        <p className="text-[11px] text-medical-secondary leading-relaxed">
          Compliant with audited models: EfficientNet-B3 (B-ALL) and YOLO26m (Myeloma).
        </p>
      </div>
    </aside>
  );
}
