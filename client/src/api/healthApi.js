import apiClient from './client';

export const checkHealth = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};

export const getModelsInfo = async () => {
  const response = await apiClient.get('/api/models');
  return response.data;
};
