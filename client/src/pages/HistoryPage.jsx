import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  FileDown,
  Trash2,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { exportLeukemiaPdf, exportMyelomaPdf } from '../api/reportApi';
import { formatDate, formatPercent, formatLatency } from '../utils/formatters';
import { generateClinicalPDF } from '../utils/pdfGenerator';

export default function HistoryPage() {
  const { history, deleteRecord, clearHistory } = useAnalysisHistory();

  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all'); // 'all' | 'leukemia' | 'myeloma'
  const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'high_risk' | 'low_risk'
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Module match
      if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;

      // Risk match
      if (riskFilter === 'high_risk' && !item.isHighRisk) return false;
      if (riskFilter === 'low_risk' && item.isHighRisk) return false;

      // Search match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesName = item.imageName.toLowerCase().includes(query);
        const matchesResult = item.result.toLowerCase().includes(query);
        const matchesPatient = (item.patientId || '').toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesResult && !matchesPatient) return false;
      }

      return true;
    });
  }, [history, moduleFilter, riskFilter, searchTerm]);

  const handleDownloadPDF = async (record) => {
    try {
      if (record.module === 'leukemia' && record.rawResponse) {
        await exportLeukemiaPdf({
          prediction_result: record.rawResponse,
          patient_id: record.patientId || 'ANONYMOUS',
        });
      } else if (record.module === 'myeloma' && record.rawResponse) {
        await exportMyelomaPdf({
          prediction_result: record.rawResponse,
          patient_id: record.patientId || 'ANONYMOUS',
        });
      } else {
        generateClinicalPDF(record);
      }
    } catch {
      generateClinicalPDF(record);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-medical-primary">
              Clinical Analysis History & Audit Trail
            </h2>
            <p className="text-xs text-medical-secondary">
              Persistently archived diagnostic evaluations from actual inference runs ({history.length} records)
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all analysis records? This action cannot be undone.')) {
                clearHistory();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-medical-border rounded-xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, file, result, or patient..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-accent bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-medical-secondary">
            <Filter className="w-3.5 h-3.5" />
            <span>Module:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs border border-medical-border rounded-lg px-2 py-1 bg-white focus:outline-none"
            >
              <option value="all">All Modules</option>
              <option value="leukemia">Leukemia (B-ALL)</option>
              <option value="myeloma">Multiple Myeloma</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-medical-secondary">
            <span>Risk Status:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs border border-medical-border rounded-lg px-2 py-1 bg-white focus:outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="high_risk">High Risk Flags</option>
              <option value="low_risk">Low Risk / Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-medical-border rounded-xl shadow-card overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-medical-primary">No Records Found</h4>
            <p className="text-xs text-medical-secondary max-w-sm mx-auto mt-1">
              {history.length === 0
                ? 'No clinical analyses have been run yet. Perform an inference evaluation in the Leukemia or Myeloma module to generate records.'
                : 'No records match your selected search query or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-medical-border text-medical-secondary font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Specimen File</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Score / Ratio</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-medical-primary whitespace-nowrap">
                      {item.module === 'leukemia' ? 'Leukemia (B-ALL)' : 'Multiple Myeloma'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[160px] truncate" title={item.imageName}>
                      {item.imageName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {item.patientId || 'ANONYMOUS'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.result}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.module === 'leukemia'
                        ? formatPercent(item.confidence)
                        : `${item.rawResponse?.plasma_cell_ratio_percent ?? (item.confidence * 100).toFixed(1)}%`}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={item.isHighRisk ? 'danger' : 'normal'}
                        label={item.isHighRisk ? 'High Risk' : 'Low Risk / Normal'}
                      />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(item)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-medical-primary transition-colors"
                        title="View Full Findings"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(item)}
                        className="p-1.5 hover:bg-medical-accent-light rounded text-medical-accent hover:text-medical-primary transition-colors"
                        title="Download PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecord(item.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Clinical Diagnostic Record — ${selectedRecord.id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header meta */}
            <div className="bg-medical-bg p-4 rounded-lg border border-medical-border grid grid-cols-2 gap-3">
              <div>
                <span className="text-medical-secondary font-medium">Specimen:</span>
                <p className="font-semibold text-medical-primary mt-0.5">{selectedRecord.imageName}</p>
              </div>
              <div>
                <span className="text-medical-secondary font-medium">Date & Time:</span>
                <p className="font-semibold text-medical-primary mt-0.5">{formatDate(selectedRecord.timestamp)}</p>
              </div>
              <div>
                <span className="text-medical-secondary font-medium">Pipeline:</span>
                <p className="font-semibold text-medical-primary mt-0.5">
                  {selectedRecord.module === 'leukemia' ? 'Leukemia (EfficientNet-B3)' : 'Myeloma (YOLO26m)'}
                </p>
              </div>
              <div>
                <span className="text-medical-secondary font-medium">Latency:</span>
                <p className="font-semibold text-medical-primary mt-0.5">{formatLatency(selectedRecord.latencyMs)}</p>
              </div>
            </div>

            {/* Findings */}
            <div className="p-4 rounded-lg border border-medical-border bg-white space-y-2">
              <span className="font-bold text-medical-primary uppercase tracking-wider block">
                Diagnostic Finding
              </span>
              <p className="text-sm font-bold text-slate-800">
                {selectedRecord.result}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {selectedRecord.summary}
              </p>
            </div>

            {/* Image Preview if available */}
            {selectedRecord.imageThumbnail && (
              <div className="p-4 rounded-lg border border-medical-border bg-slate-50 text-center">
                <span className="font-semibold text-medical-secondary block mb-2">Microscopy Capture</span>
                <img
                  src={selectedRecord.rawResponse?.annotated_image_base64
                    ? `data:image/jpeg;base64,${selectedRecord.rawResponse.annotated_image_base64}`
                    : selectedRecord.imageThumbnail}
                  alt="Captured Specimen"
                  className="max-h-52 rounded object-contain mx-auto border border-medical-border"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-medical-border">
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedRecord)}
                className="px-4 py-2 rounded-lg bg-medical-primary text-white font-semibold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Official PDF Report</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
