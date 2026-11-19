import React from 'react';
import { Link } from 'react-router-dom';
import {
  Microscope,
  Target,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowRight,
  Server,
  Activity,
  Layers
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { useBackend } from '../context/BackendContext';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import { formatDate, formatPercent } from '../utils/formatters';

export default function OverviewPage() {
  const { isOnline, health, leukemiaReady, myelomaReady, device } = useBackend();
  const { statistics, history } = useAnalysisHistory();

  return (
    <div className="space-y-8">
      {/* System Status Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-medical-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-medical-accent-light text-medical-accent flex items-center justify-center shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-medical-primary">
                  Dual Deep-Learning Inference Engine
                </h2>
                <StatusBadge
                  status={isOnline ? (health?.status === 'healthy' ? 'healthy' : 'degraded') : 'offline'}
                  label={isOnline ? (health?.status === 'healthy' ? 'Operational' : 'Degraded') : 'Offline'}
                />
              </div>
              <p className="text-xs text-medical-secondary mt-1">
                FastAPI microservice running on <span className="font-mono text-slate-700">http://localhost:8000</span> | Active Hardware: <span className="font-semibold text-medical-primary uppercase">{device}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-medical-secondary">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${leukemiaReady ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="font-medium">Leukemia (EfficientNet-B3):</span>
              <span className={leukemiaReady ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                {leukemiaReady ? 'Ready' : 'Standby'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${myelomaReady ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="font-medium">Myeloma (YOLO26m):</span>
              <span className={myelomaReady ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                {myelomaReady ? 'Ready' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* Real Dynamic Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <StatCard
            title="Total Analyses Completed"
            value={statistics.total}
            subtitle={statistics.total === 0 ? "No evaluations performed yet" : "Verifiable records in local database"}
            icon={Database}
            badgeText={statistics.total > 0 ? "Real Data" : "Zero State"}
            badgeType="neutral"
          />
          <StatCard
            title="B-ALL & Myeloma High-Risk Flags"
            value={statistics.totalHighRisk}
            subtitle="Cases requiring urgent hematologist review"
            icon={AlertTriangle}
            badgeText={statistics.totalHighRisk > 0 ? "Urgent Review" : "Nominal"}
            badgeType={statistics.totalHighRisk > 0 ? "danger" : "neutral"}
          />
          <StatCard
            title="Negative / Normal Specimens"
            value={statistics.normalLeukemiaCases + statistics.nonMyelomaCases}
            subtitle="Cytologically normal or &lt;10% plasma cell ratio"
            icon={CheckCircle}
            badgeText="Low Risk"
            badgeType="success"
          />
          <StatCard
            title="Active Model Pipelines"
            value="2 Pipelines"
            subtitle="EfficientNet-B3 & YOLO26m"
            icon={Layers}
            badgeText="Loaded"
            badgeType="accent"
          />
        </div>
      </div>

      {/* Module Cards: Leukemia and Myeloma */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-medical-primary">
            Diagnostic Inference Pipelines
          </h2>
          <p className="text-xs text-medical-secondary">
            Select a clinical module to upload microscopy specimens and execute neural network inference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Module 1: Leukemia */}
          <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
                  <Microscope className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Single-Cell Cytology
                </span>
              </div>

              <h3 className="text-lg font-bold text-medical-primary mb-2">
                Leukemia (B-ALL) Classification
              </h3>
              <p className="text-xs text-medical-secondary leading-relaxed mb-4">
                Identifies B-cell Acute Lymphoblastic Leukemia blasts from single-cell cytology microscopy smears. Employs the audited EfficientNet-B3 backbone with custom MLP classification head.
              </p>

              <div className="bg-medical-bg rounded-lg p-3 text-xs space-y-1.5 border border-medical-border mb-6">
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Model Architecture:</span>
                  <span className="font-semibold text-medical-primary">timm EfficientNet-B3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Input Resolution:</span>
                  <span className="font-semibold text-medical-primary">300 × 300 px (ImageNet)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Target Classes:</span>
                  <span className="font-semibold text-medical-primary">Normal vs B-ALL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Benchmark F1-Score:</span>
                  <span className="font-semibold text-emerald-700">0.9429 (Macro-F1)</span>
                </div>
              </div>
            </div>

            <Link
              to="/leukemia"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-medical-primary text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>Launch Leukemia Classifier</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Module 2: Multiple Myeloma */}
          <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Bone Marrow Aspirate
                </span>
              </div>

              <h3 className="text-lg font-bold text-medical-primary mb-2">
                Multiple Myeloma Detection
              </h3>
              <p className="text-xs text-medical-secondary leading-relaxed mb-4">
                Detects, localizes, and counts plasma and non-plasma cells in bone marrow microscopy slides. Computes plasma cell percentage against the &gt;10% clinical plasmacytosis threshold.
              </p>

              <div className="bg-medical-bg rounded-lg p-3 text-xs space-y-1.5 border border-medical-border mb-6">
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Model Architecture:</span>
                  <span className="font-semibold text-medical-primary">Ultralytics YOLO26m (NMS-free)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Input Resolution:</span>
                  <span className="font-semibold text-medical-primary">800 × 800 px (Conf: 0.65)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Target Classes:</span>
                  <span className="font-semibold text-medical-primary">plasma_cell / non_plasma_cell</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Benchmark Metric:</span>
                  <span className="font-semibold text-emerald-700">0.812 (mAP50)</span>
                </div>
              </div>
            </div>

            <Link
              to="/myeloma"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-medical-primary text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>Launch Myeloma Detector</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Analysis History Table */}
      <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between pb-4 border-b border-medical-border">
          <div>
            <h3 className="text-sm font-bold text-medical-primary">
              Recent Clinical Analyses
            </h3>
            <p className="text-xs text-medical-secondary">
              Latest evaluations stored in local research database.
            </p>
          </div>
          {history.length > 0 && (
            <Link
              to="/history"
              className="text-xs font-semibold text-medical-accent hover:text-medical-primary flex items-center gap-1"
            >
              <span>View All Records ({history.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-medical-primary">No Analysis Records Yet</h4>
            <p className="text-xs text-medical-secondary max-w-sm mx-auto mt-1 mb-4">
              Upload a cytology specimen in the Leukemia or Myeloma module to run real deep-learning inference. All outputs will be archived here.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/leukemia"
                className="text-xs px-3 py-1.5 rounded-lg bg-medical-accent-light text-medical-accent font-semibold hover:bg-sky-100 transition-colors"
              >
                Test Leukemia Classifier
              </Link>
              <Link
                to="/myeloma"
                className="text-xs px-3 py-1.5 rounded-lg bg-medical-accent-light text-medical-accent font-semibold hover:bg-sky-100 transition-colors"
              >
                Test Myeloma Detector
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-medical-border text-medical-secondary font-semibold">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Module</th>
                  <th className="pb-3">Specimen File</th>
                  <th className="pb-3">Diagnostic Result</th>
                  <th className="pb-3">Confidence / Ratio</th>
                  <th className="pb-3">Risk Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statistics.recent.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(rec.timestamp)}
                    </td>
                    <td className="py-3 font-semibold text-medical-primary">
                      {rec.module === 'leukemia' ? 'Leukemia (B-ALL)' : 'Multiple Myeloma'}
                    </td>
                    <td className="py-3 text-slate-700 max-w-[150px] truncate" title={rec.imageName}>
                      {rec.imageName}
                    </td>
                    <td className="py-3 font-medium text-slate-900">
                      {rec.result}
                    </td>
                    <td className="py-3 font-mono font-medium text-slate-700">
                      {rec.module === 'leukemia'
                        ? formatPercent(rec.confidence)
                        : `${rec.rawResponse?.plasma_cell_ratio_percent ?? (rec.confidence * 100).toFixed(1)}%`}
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        status={rec.isHighRisk ? 'danger' : 'normal'}
                        label={rec.isHighRisk ? 'High Risk' : 'Low Risk / Normal'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
