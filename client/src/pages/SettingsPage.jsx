import React, { useState } from 'react';
import {
  Settings,
  Server,
  Database,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { getBaseUrl, setBaseUrl } from '../api/client';
import { useBackend } from '../context/BackendContext';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import StatusBadge from '../components/common/StatusBadge';

export default function SettingsPage() {
  const { isOnline, health, device, refreshHealth, isLoading } = useBackend();
  const { history, clearHistory } = useAnalysisHistory();

  const [apiUrl, setApiUrl] = useState(getBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    setBaseUrl(apiUrl.trim());
    setSaveSuccess(true);
    refreshHealth();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medical_ai_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-medical-primary">
            System Configuration & Platform Settings
          </h2>
          <p className="text-xs text-medical-secondary">
            Manage FastAPI network endpoints, local clinical records storage, and hardware runtime parameters
          </p>
        </div>
      </div>

      {/* Backend API Configuration */}
      <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-medical-border">
          <Server className="w-4 h-4 text-medical-accent" />
          <h3 className="text-sm font-bold text-medical-primary">
            Backend API Endpoint
          </h3>
        </div>

        <form onSubmit={handleSaveApiUrl} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-medical-secondary mb-1">
              FastAPI Server URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 px-3 py-2 text-xs border border-medical-border rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-accent font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-medical-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Save URL
              </button>
            </div>
            <p className="text-[11px] text-medical-secondary mt-1">
              Default: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">http://localhost:8000</code>. Point to your remote server or local container.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>API endpoint updated successfully and active!</span>
            </div>
          )}
        </form>

        <div className="pt-3 border-t border-medical-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-medical-secondary">Live Connection Status:</span>
            <StatusBadge
              status={isOnline ? (health?.status === 'healthy' ? 'healthy' : 'degraded') : 'offline'}
              label={isOnline ? 'Online & Responsive' : 'Offline / Unreachable'}
            />
          </div>
          <button
            type="button"
            onClick={refreshHealth}
            disabled={isLoading}
            className="text-xs text-medical-accent hover:text-medical-primary font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Database & Local Storage Management */}
      <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-medical-border">
          <Database className="w-4 h-4 text-medical-accent" />
          <h3 className="text-sm font-bold text-medical-primary">
            Clinical History Storage
          </h3>
        </div>

        <p className="text-xs text-medical-secondary leading-relaxed">
          The diagnostic suite caches completed inference logs, patient outcomes, and risk metrics locally in browser storage. You can backup your verifiable clinical audit logs to JSON or reset the local database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportHistory}
            disabled={history.length === 0}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors ${
              history.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white border-medical-border text-medical-primary hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-medical-accent" />
            <span>Export Database ({history.length} Records as JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to erase all locally stored medical analysis history?')) {
                clearHistory();
              }
            }}
            disabled={history.length === 0}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors ${
              history.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Database</span>
          </button>
        </div>
      </div>

      {/* Hardware & Governance Notice */}
      <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-medical-border">
          <ShieldCheck className="w-4 h-4 text-medical-success" />
          <h3 className="text-sm font-bold text-medical-primary">
            Governance & Medical Device Disclaimer
          </h3>
        </div>

        <p className="text-xs text-medical-secondary leading-relaxed">
          This system is an investigational clinical decision support suite. All predictive classifications (B-ALL cytology probability, YOLO26m plasmacytosis bounding boxes, and computed plasma cell percentages) are intended strictly to assist qualified medical professionals. They do not constitute an autonomous medical diagnosis.
        </p>
      </div>
    </div>
  );
}
