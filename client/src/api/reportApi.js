import apiClient, { getBaseUrl } from './client';

/**
 * Generates an aggregated medical report via POST /api/report/generate.
 * @param {Object} reportRequest - Payload containing patient_info, leukemia_result, myeloma_result, custom_notes.
 * @returns {Promise<Object>} Backend report response.
 */
export const generateReport = async (reportRequest) => {
  const response = await apiClient.post('/api/report/generate', reportRequest);
  return response.data;
};

/**
 * Downloads a backend-generated Leukemia PDF directly as a blob.
 * @param {Object} exportPayload - { prediction_result, patient_id, custom_notes }
 */
export const exportLeukemiaPdf = async (exportPayload) => {
  const response = await apiClient.post('/api/leukemia/export-pdf', exportPayload, {
    responseType: 'blob',
  });
  _triggerBlobDownload(response.data, `Leukemia_Report_${Date.now()}.pdf`);
};

/**
 * Downloads a backend-generated Myeloma PDF directly as a blob.
 * @param {Object} exportPayload - { prediction_result, patient_id, custom_notes }
 */
export const exportMyelomaPdf = async (exportPayload) => {
  const response = await apiClient.post('/api/myeloma/export-pdf', exportPayload, {
    responseType: 'blob',
  });
  _triggerBlobDownload(response.data, `Myeloma_Report_${Date.now()}.pdf`);
};

/**
 * Helper to trigger browser download for a PDF blob.
 */
function _triggerBlobDownload(blobData, filename) {
  const blob = new Blob([blobData], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}
