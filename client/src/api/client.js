import axios from 'axios';

// Central Backend API URL configuration
export const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const getBaseUrl = () => {
  return localStorage.getItem('medical_ai_api_url') || DEFAULT_API_BASE_URL;
};

export const setBaseUrl = (url) => {
  if (url) {
    localStorage.setItem('medical_ai_api_url', url.replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('medical_ai_api_url');
  }
};

const apiClient = axios.create({
  timeout: 60000, // 60s timeout for deep-learning inference on high-resolution cytology images
  headers: {
    'Accept': 'application/json',
  },
});

// Dynamic baseURL interceptor so user settings change takes effect immediately
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  return config;
});

// Normalized error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected server error occurred.';
    if (error.response) {
      const data = error.response.data;
      if (typeof data === 'string') {
        message = data;
      } else if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.message) {
        message = data.message;
      } else {
        message = `Server returned HTTP ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      message = `Cannot connect to backend server at ${getBaseUrl()}. Please ensure the FastAPI backend is running.`;
    } else {
      message = error.message;
    }
    const customError = new Error(message);
    customError.originalError = error;
    customError.status = error.response?.status;
    return Promise.reject(customError);
  }
);

export default apiClient;
