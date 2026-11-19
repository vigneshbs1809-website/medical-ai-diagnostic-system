import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  Printer,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Building,
  Sparkles,
  ClipboardCheck,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import { generateReport, exportLeukemiaPdf, exportMyelomaPdf } from '../api/reportApi';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate, formatPercent } from '../utils/formatters';
import { generateClinicalPDF } from '../utils/pdfGenerator';

export default function ReportsPage() {
  const { history } = useAnalysisHistory();

  // Unified Multi-Specimen Clinical Report Builder State
  const [patientId, setPatientId] = useState('PT-2026-0814');
  const [patientAge, setPatientAge] = useState(58);
  const [patientGender, setPatientGender] = useState('Female');
  const [sampleId, setSampleId] = useState('SMP-BMA-9041');
  const [physician, setPhysician] = useState('Dr. E. Vance, MD (Hematopathology)');
  const [clinicalNotes, setClinicalNotes] = useState('Evaluation for progressive fatigue, leukopenia, and persistent bone pain.');
  const [selectedLeukemiaId, setSelectedLeukemiaId] = useState('');
  const [selectedMyelomaId, setSelectedMyelomaId] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBackendReport, setGeneratedBackendReport] = useState(null);
  const [apiError, setApiError] = useState(null);

  const leukemiaRecords = history.filter((h) => h.module === 'leukemia');
  const myelomaRecords = history.filter((h) => h.module === 'myeloma');

  const handleGenerateUnifiedReport = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setApiError(null);

    const leukRecord = history.find((h) => h.id === selectedLeukemiaId);
    const myelRecord = history.find((h) => h.id === selectedMyelomaId);

    // Exact schema matching backend ReportRequest
    const payload = {
      patient_info: {
        patient_id: patientId.trim() || 'ANONYMOUS',
        age: Number(patientAge) || null,
        gender: patientGender,
        sample_id: sampleId.trim() || null,
        sample_date: new Date().toISOString().split('T')[0],
        clinical_history: clinicalNotes.trim() || null,
        ordering_physician: physician.trim() || null,
      },
      leukemia_result: leukRecord?.rawResponse || null,
      myeloma_result: myelRecord?.rawResponse || null,
      custom_notes: clinicalNotes.trim() || null,
    };

    try {
      const resp = await generateReport(payload);
      setGeneratedBackendReport(resp.report);
    } catch (err) {
      setApiError(err.message || 'Failed to generate unified clinical report from backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSinglePDF = async (record) => {
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
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-medical-primary">
              Clinical Diagnostic Reports & Documentation
            </h2>
            <p className="text-xs text-medical-secondary">
              Generate official clinical consultation summaries and downloadable PDF documentation
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Comprehensive Report Generator & Quick Archive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Comprehensive Report Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleGenerateUnifiedReport} className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-medical-border text-xs font-bold text-medical-primary">
              <ClipboardCheck className="w-4 h-4 text-medical-accent" />
              <span>Multi-Specimen Comprehensive Report Builder</span>
            </div>

            <p className="text-xs text-medical-secondary">
              Synthesize findings from both cytological blast analysis and marrow plasmacytosis into an integrated hematology document via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">POST /api/report/generate</code>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Patient Identifier *
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Specimen / Sample ID
                </label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Biological Gender
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none bg-white"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Referring Hematopathologist
              </label>
              <input
                type="text"
                value={physician}
                onChange={(e) => setPhysician(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Attach Completed Leukemia Finding
              </label>
              <select
                value={selectedLeukemiaId}
                onChange={(e) => setSelectedLeukemiaId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none bg-white"
              >
                <option value="">-- None Selected --</option>
                {leukemiaRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.imageName} ({r.result} - {formatPercent(r.confidence)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Attach Completed Myeloma Finding
              </label>
              <select
                value={selectedMyelomaId}
                onChange={(e) => setSelectedMyelomaId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none bg-white"
              >
                <option value="">-- None Selected --</option>
                {myelomaRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.imageName} ({r.result})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Clinical Context & Symptom Notes
              </label>
              <textarea
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-medical-border rounded-lg focus:outline-none resize-none"
              />
            </div>

            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || (!selectedLeukemiaId && !selectedMyelomaId)}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isGenerating || (!selectedLeukemiaId && !selectedMyelomaId)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-medical-primary text-white hover:bg-slate-800 shadow-sm'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Synthesizing Report via Backend...' : 'Synthesize Diagnostic Report'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Generated Report Preview & Instant Downloads (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {generatedBackendReport ? (
            <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-medical-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-medical-primary">
                      Unified Hematology Consultation Report
                    </h3>
                    <StatusBadge
                      status={generatedBackendReport.risk_level === 'HIGH' ? 'danger' : 'normal'}
                      label={generatedBackendReport.overall_status}
                    />
                  </div>
                  <p className="text-xs text-medical-secondary mt-0.5">
                    Report ID: <span className="font-mono text-slate-700">{generatedBackendReport.report_id}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-medical-border hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 text-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>

              {/* Clinical Recommendations Callout */}
              {generatedBackendReport.recommendations && generatedBackendReport.recommendations.length > 0 && (
                <div className="bg-medical-bg p-4 rounded-lg border border-medical-border">
                  <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider mb-2">
                    Clinical Recommendations
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {generatedBackendReport.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-medical-accent font-bold">&bull;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formatted Markdown Preview from Backend */}
              <div className="p-4 bg-slate-50 rounded-lg border border-medical-border text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
                {generatedBackendReport.markdown_report}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card">
              <h3 className="text-sm font-bold text-medical-primary pb-3 border-b border-medical-border">
                Instant PDF Downloads for Completed Analyses
              </h3>

              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-medical-secondary">
                  No completed analyses available yet. Run an evaluation in Leukemia or Myeloma to download reports.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {history.map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-medical-primary">
                            {rec.imageName}
                          </span>
                          <StatusBadge
                            status={rec.isHighRisk ? 'danger' : 'normal'}
                            label={rec.isHighRisk ? 'High Risk' : 'Low Risk'}
                            size="sm"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {rec.module === 'leukemia' ? 'Leukemia (B-ALL)' : 'Multiple Myeloma'} | Date: {formatDate(rec.timestamp)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePDF(rec)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medical-accent-light text-medical-accent hover:bg-sky-100 font-semibold text-xs transition-colors shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
