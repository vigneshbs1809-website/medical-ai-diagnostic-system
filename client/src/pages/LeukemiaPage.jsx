import React, { useState } from 'react';
import {
  Microscope,
  Play,
  FileDown,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Clock,
  Layers,
  Sparkles,
  ShieldAlert,
  Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import ImageUploader from '../components/common/ImageUploader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { predictLeukemia } from '../api/leukemiaApi';
import { exportLeukemiaPdf } from '../api/reportApi';
import { useAnalysisHistory } from '../context/AnalysisHistoryContext';
import { useBackend } from '../context/BackendContext';
import { formatPercent, formatLatency } from '../utils/formatters';
import { generateClinicalPDF } from '../utils/pdfGenerator';

export default function LeukemiaPage() {
  const { isOnline, leukemiaReady } = useBackend();
  const { addRecord } = useAnalysisHistory();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [predictionResponse, setPredictionResponse] = useState(null);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [patientId, setPatientId] = useState('');

  // Audited model verified from technical audit
  const availableModels = [
    {
      id: 'efficientnet_b3_seed42',
      name: 'EfficientNet-B3 (Audited Seed 42 Best Checkpoint)',
      f1: '0.9429 Macro-F1',
      resolution: '300 × 300 px',
      head: 'Custom 2-layer MLP (Dropout 0.3 -> Linear 1536->256 -> GELU -> Linear 256->2)'
    }
  ];
  const [selectedModel] = useState(availableModels[0].id);

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
      const data = await predictLeukemia(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setPredictionResponse(data);

      // Extract actual fields returned by backend
      const pred = data.prediction || {};
      const perf = data.performance || {};
      const isHighRisk = pred.class_name === 'B-ALL';

      // Persist real record in history
      const record = addRecord({
        module: 'leukemia',
        imageName: selectedFile.name,
        imageThumbnail: previewUrl,
        result: pred.class_name || 'Unknown',
        confidence: pred.confidence ?? 0.0,
        summary: pred.clinical_interpretation || `Classified as ${pred.class_name} with ${(pred.confidence * 100).toFixed(2)}% confidence.`,
        isHighRisk,
        latencyMs: perf.inference_duration_ms || 0,
        rawResponse: data,
        patientId: patientId.trim() || 'ANONYMOUS',
      });
      setLastSavedRecord(record);
    } catch (err) {
      setError(err.message || 'Leukemia prediction failed.');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(null);
    }
  };

  const handleDownloadReport = async () => {
    if (!predictionResponse && !lastSavedRecord) return;
    try {
      await exportLeukemiaPdf({
        prediction_result: predictionResponse || lastSavedRecord?.rawResponse,
        patient_id: patientId.trim() || 'ANONYMOUS',
      });
    } catch (e) {
      console.warn('Backend PDF export failed, using client PDF generator fallback:', e);
      const pred = predictionResponse?.prediction || {};
      const perf = predictionResponse?.performance || {};
      const recordToPrint = lastSavedRecord || {
        id: `RPT-LEUK-${Date.now()}`,
        timestamp: new Date().toISOString(),
        module: 'leukemia',
        imageName: selectedFile?.name || 'cytology_specimen.jpg',
        imageThumbnail: previewUrl,
        result: pred.class_name || 'Unknown',
        confidence: pred.confidence ?? 0.0,
        isHighRisk: pred.class_name === 'B-ALL',
        latencyMs: perf.inference_duration_ms || 0,
        rawResponse: predictionResponse,
        patientId: patientId.trim() || 'ANONYMOUS',
      };
      generateClinicalPDF(recordToPrint);
    }
  };

  // Extract actual backend prediction payload
  const prediction = predictionResponse?.prediction;
  const performance = predictionResponse?.performance;
  const inputSpecs = predictionResponse?.input_specs;

  // Actual class probabilities from backend
  const chartData = prediction?.probabilities
    ? Object.entries(prediction.probabilities).map(([name, prob]) => ({
        name,
        probability: Number((prob * 100).toFixed(2)),
        color: name === 'B-ALL' ? '#DC2626' : '#27865C'
      }))
    : [];

  // Genuine explainability image returned by backend (if any)
  const explainabilityImage = predictionResponse?.explainability_image ||
    predictionResponse?.gradcam_base64 ||
    predictionResponse?.attention_map_base64 ||
    null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-medical-primary">
              B-cell Acute Lymphoblastic Leukemia (B-ALL) Classifier
            </h2>
            <p className="text-xs text-medical-secondary">
              Single-cell peripheral blood / bone marrow smear cytology classifier (EfficientNet-B3)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge
            status={leukemiaReady ? 'healthy' : 'offline'}
            label={leukemiaReady ? 'Model Loaded' : 'Model Offline'}
          />
        </div>
      </div>

      {/* Main Grid: Upload & Controls on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-5">
            <h3 className="text-sm font-bold text-medical-primary pb-3 border-b border-medical-border">
              Specimen Input & Settings
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

            {/* Model Architecture Selector (Audit Verified) */}
            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Deep Learning Model Checkpoint
              </label>
              <select
                value={selectedModel}
                disabled
                className="w-full px-3 py-2 text-xs border border-medical-border rounded-lg bg-slate-50 text-medical-primary font-medium cursor-not-allowed"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.f1})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Backbone: timm EfficientNet-B3 | Input: 300×300 | Seed 42 Best Checkpoint
              </p>
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-medical-secondary mb-1">
                Cytology Smear Image
              </label>
              <ImageUploader
                onImageSelected={handleImageSelected}
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                onClear={handleClear}
                disabled={isAnalyzing}
                title="Upload Single-Cell Microscopic Image"
                subtitle="High-magnification single-cell cytology image (JPG, PNG)"
              />
            </div>

            {/* Upload Progress Bar if active */}
            {isAnalyzing && uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-medical-secondary font-medium">
                  <span>{uploadProgress < 100 ? 'Uploading specimen...' : 'Processing neural network forward pass...'}</span>
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

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing || !isOnline || !leukemiaReady}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  !selectedFile || isAnalyzing || !isOnline || !leukemiaReady
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-medical-primary text-white hover:bg-slate-800 shadow-sm'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isAnalyzing ? 'Evaluating Cytology...' : 'Run Neural Classification'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Results & Visualizations (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isAnalyzing ? (
            <div className="bg-white border border-medical-border rounded-xl shadow-card">
              <LoadingSpinner
                message="Evaluating single-cell cytology with EfficientNet-B3..."
                subtext="Validating tensor, applying ImageNet normalization (300x300), and evaluating softmax class probabilities."
              />
            </div>
          ) : predictionResponse && prediction ? (
            <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-6">
              {/* Result Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-medical-border gap-3">
                <div>
                  <h3 className="text-base font-bold text-medical-primary">
                    Diagnostic Classification Results
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

              {/* Main Classification Callout */}
              <div
                className={`p-5 rounded-xl border flex items-start justify-between gap-4 ${
                  prediction.class_name === 'B-ALL'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/80 shrink-0">
                    {prediction.class_name === 'B-ALL' ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-bold">
                        Identified Class
                      </span>
                      {prediction.diagnostic_flag && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/60">
                          {prediction.diagnostic_flag}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold mt-0.5">
                      {prediction.class_name}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      {prediction.clinical_interpretation || (
                        prediction.class_name === 'B-ALL'
                          ? 'Morphological features indicative of B-cell lymphoblastic leukemia blast cells.'
                          : 'Cytological features consistent with normal/benign lymphoid cell.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 font-medium">Confidence</span>
                  <div className="text-2xl font-bold">
                    {formatPercent(prediction.confidence)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Cutoff: &tau; &gt;= 0.50</span>
                </div>
              </div>

              {/* Probability Distribution Bar Chart (Recharts) */}
              <div className="bg-medical-bg rounded-xl p-5 border border-medical-border">
                <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider mb-4">
                  Actual Class Probabilities (Softmax Output)
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                      <Tooltip
                        formatter={(val) => [`${val}%`, 'Probability']}
                        contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                      />
                      <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-medical-border text-xs">
                  <div className="bg-white p-3 rounded-lg border border-medical-border">
                    <span className="text-medical-secondary font-medium">Normal Probability:</span>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      {formatPercent(prediction.probabilities?.Normal)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-medical-border">
                    <span className="text-medical-secondary font-medium">B-ALL Probability:</span>
                    <p className="text-base font-bold text-red-700 mt-0.5">
                      {formatPercent(prediction.probabilities?.['B-ALL'])}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cytology Visual Inspection & Explainability Visualizer */}
              <div className="bg-medical-bg rounded-xl p-5 border border-medical-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider">
                    Cytology Microscopy Visualizer
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="text-xs font-semibold text-medical-accent hover:text-medical-primary flex items-center gap-1"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Expand Specimen</span>
                  </button>
                </div>

                {explainabilityImage ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-medical-border text-center">
                      <span className="text-[11px] font-semibold text-medical-secondary mb-2 block">Original Specimen</span>
                      <img
                        src={previewUrl}
                        alt="Original Cytology"
                        className="max-h-52 rounded object-contain mx-auto"
                      />
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-medical-border text-center">
                      <span className="text-[11px] font-semibold text-medical-secondary mb-2 block">Explainability Feature Activation</span>
                      <img
                        src={explainabilityImage.startsWith('data:') ? explainabilityImage : `data:image/jpeg;base64,${explainabilityImage}`}
                        alt="Feature Activation Map"
                        className="max-h-52 rounded object-contain mx-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-medical-border">
                      <img
                        src={previewUrl}
                        alt="Analyzed Cytology Specimen"
                        className="max-h-60 rounded object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600">
                      <Info className="w-3.5 h-3.5 text-medical-accent shrink-0" />
                      <span>
                        Original specimen evaluated at $300 \times 300$ px with ImageNet normalization. Explainability heatmap overlay is not generated by the deployed classification head.
                      </span>
                    </div>
                  </div>
                )}

                {inputSpecs?.original_dimensions && (
                  <p className="text-[11px] text-medical-secondary text-center mt-2">
                    Specimen Resolution: {inputSpecs.original_dimensions[0]} &times; {inputSpecs.original_dimensions[1]} px | Input Tensor: {inputSpecs.processed_dimensions?.[0] || 300} &times; {inputSpecs.processed_dimensions?.[1] || 300} px
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-medical-border rounded-xl p-12 shadow-card text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-full bg-medical-accent-light text-medical-accent flex items-center justify-center mb-4">
                <Microscope className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-medical-primary mb-1">
                Awaiting Specimen Upload
              </h3>
              <p className="text-xs text-medical-secondary max-w-md leading-relaxed">
                Select a single-cell microscopy smear on the left panel and click <strong>Run Neural Classification</strong>. The verified EfficientNet-B3 network will classify the blast morphology and return real softmax probability values.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* High-Resolution Inspection Modal */}
      <Modal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title="Microscopy Specimen Inspector"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col items-center">
          <img
            src={previewUrl}
            alt="Full Resolution Cytology"
            className="max-h-[70vh] rounded-lg object-contain border border-medical-border"
          />
          <div className="mt-4 text-center">
            <p className="text-xs font-medium text-medical-primary">
              Specimen File: {selectedFile?.name}
            </p>
            <p className="text-[11px] text-medical-secondary">
              Diagnostic Class: <strong>{prediction?.class_name || 'Pending'}</strong> | Confidence: <strong>{formatPercent(prediction?.confidence)}</strong>
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
