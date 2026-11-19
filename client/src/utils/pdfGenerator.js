import { jsPDF } from 'jspdf';
import { formatDate } from './formatters';

export function generateClinicalPDF(record) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Bar (Navy Primary)
  doc.setFillColor(24, 59, 86); // #183B56
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MEDICAL AI DIAGNOSTIC SYSTEM', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Automated Hematological Decision Support & Cytology Analysis', margin, 18);
  doc.text('CONFIDENTIAL MEDICAL REPORT', pageWidth - margin - 58, 15);

  y = 38;

  // Report Metadata Grid
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.rect(margin, y, contentWidth, 24, 'FD');

  doc.setTextColor(113, 128, 150); // #718096
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT ID:', margin + 4, y + 6);
  doc.text('DATE GENERATED:', margin + 4, y + 12);
  doc.text('PATIENT IDENTIFIER:', margin + 4, y + 18);

  doc.text('ANALYSIS MODULE:', margin + 85, y + 6);
  doc.text('SPECIMEN FILE:', margin + 85, y + 12);
  doc.text('COMPUTE LATENCY:', margin + 85, y + 18);

  doc.setTextColor(36, 52, 71); // #243447
  doc.setFont('helvetica', 'normal');
  doc.text(record.id || 'N/A', margin + 35, y + 6);
  doc.text(formatDate(record.timestamp), margin + 35, y + 12);
  doc.text(record.patientId || 'ANONYMOUS', margin + 35, y + 18);

  const moduleName = record.module === 'leukemia'
    ? 'Leukemia (B-ALL) Cytology Classifier'
    : 'Multiple Myeloma Bone Marrow Cell Detector';
  doc.text(moduleName, margin + 120, y + 6);
  doc.text(record.imageName || 'N/A', margin + 120, y + 12);
  doc.text(`${Math.round(record.latencyMs || 0)} ms`, margin + 120, y + 18);

  y += 32;

  // Diagnostic Findings Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 59, 86);
  doc.text('1. DIAGNOSTIC FINDINGS & MODEL INFERENCE', margin, y);
  y += 2;
  doc.setDrawColor(54, 124, 184); // #367CB8
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  // Module Specific Details
  if (record.module === 'leukemia') {
    const raw = record.rawResponse || {};
    const isBAll = record.isHighRisk;

    // Result Callout Box
    if (isBAll) {
      doc.setFillColor(254, 242, 242); // Red tint
      doc.setDrawColor(220, 38, 38);
    } else {
      doc.setFillColor(240, 253, 244); // Green tint
      doc.setDrawColor(39, 134, 92);
    }
    doc.rect(margin, y, contentWidth, 22, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isBAll) {
      doc.setTextColor(220, 38, 38);
      doc.text('PRIMARY CLASSIFICATION: B-ALL DETECTED (HIGH RISK)', margin + 6, y + 8);
    } else {
      doc.setTextColor(39, 134, 92);
      doc.text('PRIMARY CLASSIFICATION: NORMAL CYTOLOGY (NEGATIVE)', margin + 6, y + 8);
    }

    doc.setFontSize(8.5);
    doc.setTextColor(36, 52, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(`Model Confidence: ${(Number(record.confidence) * 100).toFixed(2)}%`, margin + 6, y + 15);
    doc.text(
      `Normal: ${((raw.class_probabilities?.Normal || 0) * 100).toFixed(2)}%  |  B-ALL: ${((raw.class_probabilities?.['B-ALL'] || 0) * 100).toFixed(2)}%`,
      margin + 70,
      y + 15
    );

    y += 30;

    // Model Architecture details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(24, 59, 86);
    doc.text('Model Specifications:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('- Architecture: EfficientNet-B3 (timm backbone) with 2-layer MLP classification head', margin + 4, y);
    y += 4;
    doc.text('- Input Resolution: 300 x 300 px (ImageNet normalization)', margin + 4, y);
    y += 4;
    doc.text('- Checkpoint: models/leukemia/checkpoints/seed42/efficientnet_b3_best.pt (Test Macro-F1: 0.9429)', margin + 4, y);
    y += 10;

  } else {
    // Myeloma Findings
    const raw = record.rawResponse || {};
    const isSuspected = record.isHighRisk;

    if (isSuspected) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(220, 38, 38);
    } else {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(39, 134, 92);
    }
    doc.rect(margin, y, contentWidth, 22, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isSuspected) {
      doc.setTextColor(220, 38, 38);
      doc.text('PLASMACYTOSIS ASSESSMENT: HIGH RISK (SUSPECTED MULTIPLE MYELOMA)', margin + 6, y + 8);
    } else {
      doc.setTextColor(39, 134, 92);
      doc.text('PLASMACYTOSIS ASSESSMENT: LOW RISK (BELOW 10% CUTOFF)', margin + 6, y + 8);
    }

    doc.setFontSize(8.5);
    doc.setTextColor(36, 52, 71);
    doc.setFont('helvetica', 'normal');
    const ratio = raw.plasma_cell_ratio_percent !== undefined ? raw.plasma_cell_ratio_percent : (record.confidence * 100);
    doc.text(`Plasma Cell Ratio: ${Number(ratio).toFixed(2)}% (Diagnostic Cutoff: >10.0%)`, margin + 6, y + 15);
    doc.text(
      `Plasma Cells: ${raw.plasma_cell_count ?? '0'}  |  Non-Plasma Cells: ${raw.non_plasma_cell_count ?? '0'}  |  Total: ${raw.total_cells_detected ?? '0'}`,
      margin + 80,
      y + 15
    );

    y += 30;

    // Model Architecture details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(24, 59, 86);
    doc.text('Model Specifications:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('- Architecture: YOLO26m (Ultralytics) End-to-End NMS-free Object Detector with C3k2 & C2PSA', margin + 4, y);
    y += 4;
    doc.text('- Input Resolution: 800 x 800 px (Confidence Threshold: 0.65, IoU: 0.60)', margin + 4, y);
    y += 4;
    doc.text('- Checkpoint: models/myeloma/final_yolo26m.pt (Validation mAP50: 0.812, mAP50-95: 0.658)', margin + 4, y);
    y += 10;
  }

  // Visual Image Embedding if annotated or thumbnail available
  const imgData = record.rawResponse?.annotated_image_base64
    ? `data:image/jpeg;base64,${record.rawResponse.annotated_image_base64}`
    : record.imageThumbnail;

  if (imgData && imgData.startsWith('data:image')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 59, 86);
    doc.text('2. CYTOLOGICAL / DETECTION VISUALIZATION', margin, y);
    y += 2;
    doc.setDrawColor(54, 124, 184);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    try {
      doc.addImage(imgData, 'JPEG', margin, y, 70, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 128, 150);
      doc.text('Annotated microscopy inspection capture.', margin + 75, y + 10);
      doc.text('Features identified by deep learning bounding box extractor.', margin + 75, y + 15);
      y += 75;
    } catch {
      y += 10;
    }
  }

  // Clinical Recommendation & Legal Disclaimer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 59, 86);
  doc.text('3. CLINICAL RECOMMENDATIONS & GOVERNANCE', margin, y);
  y += 2;
  doc.setDrawColor(54, 124, 184);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(36, 52, 71);

  if (record.isHighRisk) {
    doc.text('• URGENT REVIEW REQUIRED: Findings indicate elevated cellular markers warranting immediate pathologist review.', margin, y);
    y += 4;
    doc.text('• Confirm diagnosis using multi-parameter flow cytometry and bone marrow core biopsy histopathology.', margin, y);
    y += 4;
    doc.text('• Perform complete metabolic panel (serum protein electrophoresis, free light chains, calcium, creatinine).', margin, y);
  } else {
    doc.text('• Routine monitoring: Current specimen shows no elevated cytological markers exceeding risk cutoffs.', margin, y);
    y += 4;
    doc.text('• Correlate with clinical symptom history, CBC with differential, and prior baseline studies.', margin, y);
  }
  y += 8;

  // Regulatory Disclaimer Box
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 16, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'IMPORTANT NOTICE: This document was generated by an investigational AI diagnostic assistance system.\n' +
    'The reported metrics do not constitute an independent medical diagnosis. Clinical validation by a qualified\n' +
    'board-certified hematopathologist is mandatory prior to treatment initiation or clinical intervention.',
    margin + 4,
    y + 4
  );

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Medical AI Diagnostic Platform v1.0.0  |  Powered by EfficientNet-B3 & YOLO26m  |  Page 1 of 1', margin, footerY);

  // Save PDF
  const filename = `${record.id || 'diagnostic-report'}.pdf`;
  doc.save(filename);
}
