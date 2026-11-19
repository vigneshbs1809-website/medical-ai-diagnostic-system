import React, { useState } from 'react';
import {
  Binary,
  Microscope,
  Target,
  CheckCircle2,
  Cpu,
  Layers,
  FileCode,
  ShieldCheck,
  Award,
  RefreshCw,
  Server
} from 'lucide-react';
import { useBackend } from '../context/BackendContext';
import StatusBadge from '../components/common/StatusBadge';

export default function ModelInfoPage() {
  const { modelsInfo, refreshModels, isLoading } = useBackend();
  const [activeTab, setActiveTab] = useState('leukemia'); // 'leukemia' | 'myeloma'

  const liveLeukemiaInfo = modelsInfo?.system_status?.models?.leukemia?.info || modelsInfo?.system_status?.models?.leukemia;
  const liveMyelomaInfo = modelsInfo?.system_status?.models?.myeloma?.info || modelsInfo?.system_status?.models?.myeloma;
  const isLeukemiaReady = modelsInfo?.system_status?.models?.leukemia?.is_ready ?? true;
  const isMyelomaReady = modelsInfo?.system_status?.models?.myeloma?.is_ready ?? true;
  const liveDevice = modelsInfo?.system_status?.device || 'cpu';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-medical-border rounded-xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-medical-accent-light text-medical-accent flex items-center justify-center">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-medical-primary">
                Audited Neural Network Architecture & Specifications
              </h2>
              <button
                type="button"
                onClick={refreshModels}
                disabled={isLoading}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Refresh live specs from /api/models"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-medical-accent' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-medical-secondary">
              Live technical specifications retrieved from <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">GET /api/models</code> and audited benchmark results
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-medical-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('leukemia')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'leukemia'
                ? 'bg-white text-medical-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leukemia (EfficientNet-B3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('myeloma')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'myeloma'
                ? 'bg-white text-medical-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Myeloma (YOLO26m)
          </button>
        </div>
      </div>

      {/* Tab 1: Leukemia (B-ALL) */}
      {activeTab === 'leukemia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                  Backbone Architecture
                </span>
                <StatusBadge
                  status={isLeukemiaReady ? 'healthy' : 'offline'}
                  label={isLeukemiaReady ? 'Live in Memory' : 'Unloaded'}
                  size="sm"
                />
              </div>
              <h3 className="text-xl font-bold text-medical-primary mt-1">
                {liveLeukemiaInfo?.architecture || 'EfficientNet-B3 + MLP Head'}
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                Framework: {liveLeukemiaInfo?.framework || 'PyTorch / timm'} (12.2M Params)
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                Audited Test Macro-F1
              </span>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                0.9429 (94.29%)
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                Seed 42 Best Checkpoint | Val Loss: 0.1746
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                Inference Tensor Input
              </span>
              <h3 className="text-xl font-bold text-medical-primary mt-1">
                {liveLeukemiaInfo?.input_resolution ? `${liveLeukemiaInfo.input_resolution[0]} × ${liveLeukemiaInfo.input_resolution[1]} px` : '300 × 300 px'}
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                ImageNet Normalization | Device: {liveDevice.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-medical-primary pb-3 border-b border-medical-border">
              Technical Audit & Structural Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Framework & Library:</span>
                  <span className="font-semibold text-medical-primary">PyTorch + timm (PyTorch Image Models)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Model Checkpoint Path:</span>
                  <span className="font-mono text-[11px] text-slate-800">{liveLeukemia?.checkpoint || 'models/leukemia/checkpoints/seed42/efficientnet_b3_best.pt'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Class Mapping:</span>
                  <span className="font-mono text-slate-800">{JSON.stringify(liveLeukemia?.class_mapping || { "0": "Normal", "1": "B-ALL" })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Classification Head:</span>
                  <span className="font-mono text-[11px] text-slate-800">Dropout(0.3) -&gt; Linear(1536, 256) -&gt; GELU -&gt; Dropout(0.3) -&gt; Linear(256, 2)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Training Optimizer:</span>
                  <span className="font-semibold text-medical-primary">AdamW with CosineAnnealingLR</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Loss Function:</span>
                  <span className="font-semibold text-medical-primary">CrossEntropyLoss with label smoothing</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Optimal Cutoff Threshold:</span>
                  <span className="font-mono text-slate-800">&tau; = 0.50 (Softmax max prob)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Multi-Seed Verification:</span>
                  <span className="font-semibold text-medical-primary">Seeds 42, 1337, 2024 evaluated</span>
                </div>
              </div>
            </div>

            {/* Model Comparison Table from Audit */}
            <div className="pt-4">
              <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider mb-3">
                Architectural Benchmark Comparison (Audited Results)
              </h4>
              <div className="overflow-x-auto rounded-lg border border-medical-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-medical-border text-medical-secondary font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Architecture</th>
                      <th className="py-2.5 px-4">Parameters</th>
                      <th className="py-2.5 px-4">Validation Macro-F1</th>
                      <th className="py-2.5 px-4">Test Macro-F1</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-emerald-50/50 font-semibold text-emerald-900">
                      <td className="py-2.5 px-4">EfficientNet-B3 (Selected)</td>
                      <td className="py-2.5 px-4 font-mono">12.2 M</td>
                      <td className="py-2.5 px-4 font-mono">0.9413</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">0.9429</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">Selected Champion</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">ConvNeXt-Tiny</td>
                      <td className="py-2.5 px-4 font-mono">28.6 M</td>
                      <td className="py-2.5 px-4 font-mono">0.9298</td>
                      <td className="py-2.5 px-4 font-mono">0.9312</td>
                      <td className="py-2.5 px-4 text-slate-500">Benchmark Baseline</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Swin-T (Transformer)</td>
                      <td className="py-2.5 px-4 font-mono">28.3 M</td>
                      <td className="py-2.5 px-4 font-mono">0.9265</td>
                      <td className="py-2.5 px-4 font-mono">0.9280</td>
                      <td className="py-2.5 px-4 text-slate-500">Benchmark Baseline</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">DenseNet-121</td>
                      <td className="py-2.5 px-4 font-mono">7.0 M</td>
                      <td className="py-2.5 px-4 font-mono">0.9234</td>
                      <td className="py-2.5 px-4 font-mono">0.9251</td>
                      <td className="py-2.5 px-4 text-slate-500">Benchmark Baseline</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">ResNet-50</td>
                      <td className="py-2.5 px-4 font-mono">25.6 M</td>
                      <td className="py-2.5 px-4 font-mono">0.9095</td>
                      <td className="py-2.5 px-4 font-mono">0.9124</td>
                      <td className="py-2.5 px-4 text-slate-500">Benchmark Baseline</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Multiple Myeloma */}
      {activeTab === 'myeloma' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                  Detector Architecture
                </span>
                <StatusBadge
                  status={isMyelomaReady ? 'healthy' : 'offline'}
                  label={isMyelomaReady ? 'Live in Memory' : 'Unloaded'}
                  size="sm"
                />
              </div>
              <h3 className="text-xl font-bold text-medical-primary mt-1">
                {liveMyelomaInfo?.architecture || 'YOLO26m (NMS-Free End-to-End)'}
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                Framework: {liveMyelomaInfo?.framework || 'Ultralytics YOLO / PyTorch'} (25.5M Params)
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                Audited Validation mAP50
              </span>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                0.812 (81.2%)
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                mAP50-95: 0.658 | Plasma Cell Recall: 0.793
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-medical-border shadow-card">
              <span className="text-xs font-semibold text-medical-secondary uppercase tracking-wider">
                Inference Resolution
              </span>
              <h3 className="text-xl font-bold text-medical-primary mt-1">
                {liveMyelomaInfo?.input_resolution ? `${liveMyelomaInfo.input_resolution[0]} × ${liveMyelomaInfo.input_resolution[1]} px` : '800 × 800 px'}
              </h3>
              <p className="text-xs text-medical-secondary mt-1">
                Conf: {liveMyelomaInfo?.confidence_threshold || 0.65} | IoU: {liveMyelomaInfo?.nms_iou || 0.60}
              </p>
            </div>
          </div>

          <div className="bg-white border border-medical-border rounded-xl p-6 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-medical-primary pb-3 border-b border-medical-border">
              Technical Audit & Structural Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Framework & Library:</span>
                  <span className="font-semibold text-medical-primary">Ultralytics YOLO (&gt;= 8.4.200)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Model Checkpoint Path:</span>
                  <span className="font-mono text-[11px] text-slate-800">{liveMyeloma?.checkpoint || 'models/myeloma/final_yolo26m.pt'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Class Names:</span>
                  <span className="font-mono text-slate-800">{JSON.stringify(liveMyeloma?.class_mapping || { "0": "plasma_cell", "1": "non_plasma_cell" })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">End-to-End Head:</span>
                  <span className="font-mono text-[11px] text-slate-800">end2end: True, reg_max: 1 (One-to-one matching)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Attention Modules:</span>
                  <span className="font-semibold text-medical-primary">C3k2 and C2PSA (Cross Stage Partial Self-Attention)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Diagnostic Plasmacytosis Cutoff:</span>
                  <span className="font-bold text-red-600">&gt; 10.0% Plasma Cell Ratio</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Bounding Box Format:</span>
                  <span className="font-mono text-slate-800">[xmin, ymin, xmax, ymax] pixel coordinates</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-medical-secondary font-medium">Visual Annotation:</span>
                  <span className="font-semibold text-medical-primary">OpenCV headless color-coded overlays</span>
                </div>
              </div>
            </div>

            {/* Model Comparison Table from Audit */}
            <div className="pt-4">
              <h4 className="text-xs font-bold text-medical-primary uppercase tracking-wider mb-3">
                Architectural Benchmark Comparison (Audited Results)
              </h4>
              <div className="overflow-x-auto rounded-lg border border-medical-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-medical-border text-medical-secondary font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Detector Architecture</th>
                      <th className="py-2.5 px-4">Parameters</th>
                      <th className="py-2.5 px-4">Validation mAP50</th>
                      <th className="py-2.5 px-4">mAP50-95</th>
                      <th className="py-2.5 px-4">Plasma Precision</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-emerald-50/50 font-semibold text-emerald-900">
                      <td className="py-2.5 px-4">YOLO26m (Selected)</td>
                      <td className="py-2.5 px-4 font-mono">25.5 M</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">0.812</td>
                      <td className="py-2.5 px-4 font-mono">0.658</td>
                      <td className="py-2.5 px-4 font-mono">0.841</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">Selected Champion</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">YOLOv8m</td>
                      <td className="py-2.5 px-4 font-mono">25.9 M</td>
                      <td className="py-2.5 px-4 font-mono">0.784</td>
                      <td className="py-2.5 px-4 font-mono">0.612</td>
                      <td className="py-2.5 px-4 font-mono">0.803</td>
                      <td className="py-2.5 px-4 text-slate-500">Benchmark Baseline</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
