import apiClient from './client';

/**
 * Executes B-ALL leukemia classification via POST /api/leukemia/predict.
 * @param {File} imageFile - Validated cytology image file (JPG, PNG).
 * @param {Function} [onUploadProgress] - Optional callback receiving upload progress percentage (0-100).
 * @returns {Promise<Object>} Backend inference response.
 */
export const predictLeukemia = async (imageFile, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await apiClient.post('/api/leukemia/predict', formData, {
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
