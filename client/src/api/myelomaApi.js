import apiClient from './client';

/**
 * Executes Multiple Myeloma cell detection via POST /api/myeloma/predict.
 * @param {File} imageFile - Validated bone marrow aspirate image (JPG, PNG).
 * @param {Function} [onUploadProgress] - Optional callback receiving upload progress percentage (0-100).
 * @returns {Promise<Object>} Backend inference response.
 */
export const predictMyeloma = async (imageFile, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await apiClient.post('/api/myeloma/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percent);
      }
    },
  });
  return response.data;
};
