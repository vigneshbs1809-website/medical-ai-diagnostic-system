import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkHealth, getModelsInfo } from '../api/healthApi';

const BackendContext = createContext(null);

export const BackendProvider = ({ children }) => {
  const [health, setHealth] = useState(null);
  const [modelsInfo, setModelsInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await checkHealth();
      setHealth(data);
      setIsOnline(data.status === 'healthy' || data.status === 'degraded');
      setError(null);
    } catch (err) {
      setIsOnline(false);
      setError(err.message || 'Backend unreachable');
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const info = await getModelsInfo();
      setModelsInfo(info);
    } catch (err) {
      console.warn('Failed to load detailed model metadata:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchModels();

    // Check health every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchModels]);

  const value = {
    health,
    modelsInfo,
    isOnline,
    isLoading,
    lastChecked,
    error,
    refreshHealth: fetchStatus,
    refreshModels: fetchModels,
    leukemiaReady: health?.models?.leukemia_model_ready ?? false,
    myelomaReady: health?.models?.myeloma_model_ready ?? false,
    device: health?.device || 'cpu',
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
};

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};
