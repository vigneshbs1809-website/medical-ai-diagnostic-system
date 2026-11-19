import React, { useState } from 'react';
import {
  Target,
  Play,
  FileDown,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Clock,
  Layers,
  Sparkles,
  Maximize2,
  Layers2
} from 'lucide-react';
import ImageUploader from '../components/common/ImageUploader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { predictMyeloma } from '../api/myelomaApi';
import { exportMyelomaPdf } from '../api/reportApi';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import { useBackend } from '../context/BackendContext';
import { formatPercent, formatLatency } from '../utils/formatters';
import { generateClinicalPDF } from '../utils/pdfGenerator';

export default function MyelomaPage() {
  const { isOnline, myelomaReady } = useBackend();
  const { addRecord } = useAnalysisHistory();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [predictionResponse, setPredictionResponse] = useState(null);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('annotated'); // 'annotated' | 'original' | 'side-by-side'
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [patientId, setPatientId] = useState('');

  const handleImageSelected = (file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPredictionResponse(null);
    setLastSavedRecord(null);
    setError(null);
    setUploadProgress(null);
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPredictionResponse(null);
    setLastSavedRecord(null);
    setError(null);
    setUploadProgress(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isAnalyzing) return; // Prevent duplicate requests
    setIsAnalyzing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Execute inference via Axios with upload progress callback
      const data = await predictMyeloma(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setPredictionResponse(data);

      // Extract real fields returned by backend
      const counts = data.cell_counts || {};
      const diag = data.diagnosis || {};
      const perf = data.performance || {};
      const isHighRisk = !!diag.myeloma_suspected;

      // Persist real record in history
      const record = addRecord({
        module: 'myeloma',
        imageName: selectedFile.name,
        imageThumbnail: previewUrl,
        result: isHighRisk ? 'Suspected Myeloma (Plasmacytosis >10%)' : 'Normal / Low Risk (<10%)',
        confidence: (counts.plasma_cell_percentage || 0) / 100,
        summary: diag.clinical_interpretation || `Detected ${counts.total_cells || 0} cells (${counts.plasma_cells || 0} plasma cells, ${counts.plasma_cell_percentage || 0}% ratio).`,
        isHighRisk,
        latencyMs: perf.inference_duration_ms || 0,
        rawResponse: data,
        patientId: patientId.trim() || 'ANONYMOUS',
      });
      setLastSavedRecord(record);
    } catch (err) {
      setError(err.message || 'Myeloma detection failed.');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(null);
    }
  };

  const handleDownloadReport = async () => {
    if (!predictionResponse && !lastSavedRecord) return;
    try {
      await exportMyelomaPdf({
        prediction_result: predictionResponse || lastSavedRecord?.rawResponse,
        patient_id: patientId.trim() || 'ANONYMOUS',
      });
    } catch (e) {
      console.warn('Backend PDF export failed, using client PDF generator fallback:', e);
      const diag = predictionResponse?.diagnosis || {};
      const counts = predictionResponse?.cell_counts || {};
      const perf = predictionResponse?.performance || {};
      const isHighRisk = !!diag.myeloma_suspected;

      const recordToPrint = lastSavedRecord || {
        id: `RPT-MYEL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        module: 'myeloma',
        imageName: selectedFile?.name || 'marrow_slide.jpg',
        imageThumbnail: previewUrl,
        result: isHighRisk ? 'Suspected Myeloma (Plasmacytosis >10%)' : 'Normal / Low Risk (<10%)',
        confidence: (counts.plasma_cell_percentage || 0) / 100,
        isHighRisk,
        latencyMs: perf.inference_duration_ms || 0,
        rawResponse: predictionResponse,
        patientId: patientId.trim() || 'ANONYMOUS',
      };
      generateClinicalPDF(recordToPrint);
    }
  };

    // Extract actual backend fields
    const cellCounts = predictionResponse?.cell_counts;
    const diagnosis = predictionResponse?.diagnosis;
    const detections = predictionResponse?.detections || [];
    const performance = predictionResponse?.performance;
    const inputSpecs = predictionResponse?.input_specs;

    const annotatedDataUrl = predictionResponse?.annotated_image_base64
      ? (predictionResponse.annotated_image_base64.startsWith('data:')
        ? predictionResponse.annotated_image_base64
        : `data:image/jpeg;base64,${predictionResponse.annotated_image_base64}`)
      : null;

    return (
      <div className="space-y-6">
        {/* Top Banner */}
        <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-medical-primary">
                Multiple Myeloma Detection & Plasmacytosis Counter
              </h2>
              <p className="text-xs text-medical-secondary">
                Bone marrow aspirate cellular detection powered by audited YOLO26m end-to-end NMS-free network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge
              status={myelomaReady ? 'healthy' : 'offline'}
              label={myelomaReady ? 'Model Loaded' : 'Model Offline'}
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input & Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-5">
              <h3 className="text-sm font-bold text-medical-primary pb-3 border-b border-medical-border">
                Specimen Input & Detector Parameters
              </h3>

              {/* Optional Patient ID */}
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Patient / Accession ID (Optional)
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. PT-2026-90412"
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 text-xs border border-medical-border rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-accent bg-white"
                />
              </div>

              {/* Model Architecture Info */}
              <div className="bg-medical-bg rounded-lg p-3 text-xs border border-medical-border space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-medical-secondary">Detector:</span>
                  <span className="text-medical-primary font-semibold">YOLO26m (End-to-End NMS-free)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Inference Resolution:</span>
                  <span className="text-medical-primary">800 × 800 px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Detection Threshold:</span>
                  <span className="text-medical-primary font-mono">0.65 Confidence / 0.60 IoU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-secondary">Diagnostic Cutoff:</span>
                  <span className="text-medical-primary font-bold text-red-600">&gt;10.0% Plasma Ratio</span>
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-semibold text-medical-secondary mb-1">
                  Bone Marrow Microscopy Slide
                </label>
                <ImageUploader
                  onImageSelected={handleImageSelected}
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  onClear={handleClear}
                  disabled={isAnalyzing}
                  title="Upload Bone Marrow Aspirate Image"
                  subtitle="High-magnification microscopy field (JPG, PNG)"
                />
              </div>

              {/* Upload Progress Bar if active */}
              {isAnalyzing && uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-medical-secondary font-medium">
                    <span>{uploadProgress < 100 ? 'Uploading slide image...' : 'Running YOLO26m neural inference...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-medical-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Inference Error: </span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing || !isOnline || !myelomaReady}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${!selectedFile || isAnalyzing || !isOnline || !myelomaReady
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-medical-primary text-white hover:bg-slate-800 shadow-sm'
                    }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? 'Detecting & Counting Cells...' : 'Run Myeloma Detection'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Detection Results & Visualizations (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {isAnalyzing ? (
              <div className="bg-white border border-medical-border rounded-xl shadow-card">
                <LoadingSpinner
                  message="Running YOLO26m end-to-end cellular detector..."
                  subtext="Extracting cell bounding boxes at 800x800 resolution, classifying plasma vs non-plasma cells, and computing plasmacytosis percentage."
                />
              </div>
            ) : predictionResponse && cellCounts && diagnosis ? (
              <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-6">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-medical-border gap-3">
                  <div>
                    <h3 className="text-base font-bold text-medical-primary">
                      Cellular Detection & Plasmacytosis Analysis
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-medical-secondary mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Latency: <strong>{formatLatency(performance?.inference_duration_ms)}</strong></span>
                      </span>
                      <span>•</span>
                      <span>Device: <strong className="uppercase">{performance?.device || 'cpu'}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-medical-accent text-medical-accent hover:bg-medical-accent-light text-xs font-semibold transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF Report</span>
                  </button>
                </div>

                {/* Clinical Assessment Callout */}
                <div
                  className={`p-5 rounded-xl border flex items-start justify-between gap-4 ${diagnosis.myeloma_suspected
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/80 shrink-0">
                      {diagnosis.myeloma_suspected ? (
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-bold">
                          Clinical Risk Evaluation
                        </span>
                        {diagnosis.diagnostic_status && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/60">
                            {diagnosis.diagnostic_status}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xl font-bold mt-0.5">
                        {diagnosis.myeloma_suspected
                          ? 'Suspected Multiple Myeloma (Elevated Plasmacytosis)'
                          : 'Normal / Low Risk Plasmacytosis (<10% Cutoff)'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">
                        {diagnosis.clinical_interpretation || (
                          diagnosis.myeloma_suspected
                            ? 'Plasma cell proportion exceeds the 10.0% diagnostic threshold. Bone marrow biopsy and serum protein electrophoresis are strongly indicated.'
                            : 'Plasma cell proportion is within acceptable diagnostic thresholds. Correlate with clinical presentation.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500 font-medium">Plasma Ratio</span>
                    <div className="text-2xl font-bold">
                      {Number(cellCounts.plasma_cell_percentage || 0).toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Cutoff: &gt;10.0%</span>
                  </div>
                </div>

                {/* Cell Count Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-medical-bg p-3.5 rounded-xl border border-medical-border text-center">
                    <span className="text-medical-secondary font-medium">Plasma Cells</span>
                    <p className="text-xl font-bold text-red-600 mt-1">
                      {cellCounts.plasma_cells ?? 0}
                    </p>
                    <span className="text-[10px] text-slate-500">Malignant marker</span>
                  </div>
                  <div className="bg-medical-bg p-3.5 rounded-xl border border-medical-border text-center">
                    <span className="text-medical-secondary font-medium">Non-Plasma Cells</span>
                    <p className="text-xl font-bold text-slate-700 mt-1">
                      {cellCounts.non_plasma_cells ?? 0}
                    </p>
                    <span className="text-[10px] text-slate-500">Background marrow</span>
                  </div>
                  <div className="bg-medical-bg p-3.5 rounded-xl border border-medical-border text-center">
                    <span className="text-medical-secondary font-medium">Total Cells</span>
                    <p className="text-xl font-bold text-medical-primary mt-1">
                      {cellCounts.total_cells ?? 0}
                    </p>
                    <span className="text-[10px] text-slate-500">Detected targets</span>
                  </div>
                  <div className="bg-medical-bg p-3.5 rounded-xl border border-medical-border text-center">
                    <span className="text-medical-secondary font-medium">Plasmacytosis %</span>
                    <p className={`text-xl font-bold mt-1 ${diagnosis.myeloma_suspected ? 'text-red-600' : 'text-emerald-700'}`}>
                      {Number(cellCounts.plasma_cell_percentage || 0).toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-slate-500">&gt;10% = Suspected</span>
                  </div>
                </div>

                {/* Microscopy Visual Inspector with View Mode Switcher */}
                <div className="bg-medical-bg rounded-xl p-5 border border-medical-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-medical-border gap-2 mb-4">
                    <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider">
                      Cellular Localization & Bounding Boxes
                    </h4>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-medical-border bg-white p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setViewMode('annotated')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewMode === 'annotated' ? 'bg-medical-primary text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          AI Annotated
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('original')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewMode === 'original' ? 'bg-medical-primary text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('side-by-side')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewMode === 'side-by-side' ? 'bg-medical-primary text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          Side-by-Side
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsZoomOpen(true)}
                        className="p-1.5 rounded-lg border border-medical-border bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Full Screen Inspection"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Images View */}
                  {viewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-medical-border text-center">
                        <span className="text-[11px] font-semibold text-medical-secondary mb-2 block">Original Micrograph</span>
                        <img
                          src={previewUrl}
                          alt="Original Slide"
                          className="w-full max-h-64 object-contain rounded mx-auto"
                        />
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-medical-border text-center">
                        <span className="text-[11px] font-semibold text-medical-secondary mb-2 block">YOLO26m Cell Detections</span>
                        <img
                          src={annotatedDataUrl || previewUrl}
                          alt="Annotated Detections"
                          className="w-full max-h-64 object-contain rounded mx-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-medical-border">
                      <img
                        src={viewMode === 'annotated' ? (annotatedDataUrl || previewUrl) : previewUrl}
                        alt="Microscopy Inspection"
                        className="max-h-72 object-contain rounded"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-6 text-[11px] text-medical-secondary mt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-600 inline-block" />
                      <span>Plasma Cell ({cellCounts.plasma_cells ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-sky-600 inline-block" />
                      <span>Non-Plasma Cell ({cellCounts.non_plasma_cells ?? 0})</span>
                    </div>
                  </div>
                </div>

                {/* Detected Bounding Boxes Table */}
                {detections.length > 0 && (
                  <div className="bg-medical-bg rounded-xl p-5 border border-medical-border">
                    <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider mb-3">
                      Detected Cellular Targets ({detections.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-medical-border bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0 border-b border-medical-border text-medical-secondary">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Class</th>
                            <th className="py-2 px-3">Confidence</th>
                            <th className="py-2 px-3">Bounding Box [xmin, ymin, xmax, ymax]</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detections.map((det, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[11px] ${det.class_name === 'plasma_cell'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                                  }`}>
                                  {det.class_name}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-mono font-medium text-slate-700">
                                {formatPercent(det.confidence)}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">
                                [{det.bbox?.map((v) => Math.round(v)).join(', ')}]
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-medical-border rounded-xl p-12 shadow-card text-center flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-16 h-16 rounded-full bg-medical-accent-light text-medical-accent flex items-center justify-center mb-4">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-medical-primary mb-1">
                  Awaiting Bone Marrow Specimen
                </h3>
                <p className="text-xs text-medical-secondary max-w-md leading-relaxed">
                  Upload a bone marrow aspirate slide on the left panel and click <strong>Run Myeloma Detection</strong>. The verified YOLO26m neural network will localize plasma cells, compute the cellular ratio, and render visual bounding boxes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Full Resolution Inspection Modal */}
        <Modal
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          title="Microscopy High-Resolution Cellular Inspection"
          maxWidth="max-w-5xl"
        >
          <div className="flex flex-col items-center">
            <img
              src={annotatedDataUrl || previewUrl}
              alt="Annotated Marrow Cells"
              className="max-h-[75vh] rounded-lg object-contain border border-medical-border"
            />
            <div className="mt-4 text-center">
              <p className="text-xs font-medium text-medical-primary">
                Specimen: {selectedFile?.name} | Total Cells: <strong>{cellCounts?.total_cells || 0}</strong> | Plasma Ratio: <strong>{Number(cellCounts?.plasma_cell_percentage || 0).toFixed(1)}%</strong>
              </p>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
