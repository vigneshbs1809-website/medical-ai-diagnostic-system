import React from 'react';
import { Activity, RefreshCw, Cpu, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useBackend } from '../../context/BackendContext';
import { formatDate } from '../../utils/formatters';

export default function Header({ title, subtitle }) {
  const { isOnline, health, device, lastChecked, refreshHealth, isLoading } = useBackend();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-medical-border px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-medical-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-medical-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Hardware accelerator badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-medical-bg rounded-md border border-medical-border text-xs text-medical-secondary font-medium">
          <Cpu className="w-3.5 h-3.5 text-medical-accent" />
          <span>Device:</span>
          <span className="font-semibold text-medical-primary uppercase">{device}</span>
        </div>

        {/* Live Backend Connection Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-md border border-medical-border text-xs shadow-sm">
          {isOnline ? (
            health?.status === 'healthy' ? (
              <div className="flex items-center gap-1.5 text-medical-success font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Backend Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>System Degraded</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 text-red-600 font-medium">
              <XCircle className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          )}

          <button
            onClick={refreshHealth}
            disabled={isLoading}
            title={lastChecked ? `Last ping: ${formatDate(lastChecked)}` : 'Ping backend'}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-medical-accent' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
