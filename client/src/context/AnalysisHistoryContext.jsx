import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AnalysisHistoryContext = createContext(null);

const STORAGE_KEY = 'medical_ai_analysis_history';

export const AnalysisHistoryProvider = ({ children }) => {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse history from localStorage:', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }, [history]);

  const addRecord = (record) => {
    const newRecord = {
      id: record.id || `REC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      timestamp: record.timestamp || new Date().toISOString(),
      module: record.module, // 'leukemia' | 'myeloma'
      imageName: record.imageName,
      imageThumbnail: record.imageThumbnail || null, // Base64 or object URL (compressed if needed)
      result: record.result,
      confidence: record.confidence ?? null,
      summary: record.summary || '',
      isHighRisk: !!record.isHighRisk,
      latencyMs: record.latencyMs || 0,
      rawResponse: record.rawResponse || null,
      patientId: record.patientId || 'ANONYMOUS',
    };

    setHistory((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const deleteRecord = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const getRecord = (id) => {
    return history.find((item) => item.id === id) || null;
  };

  // Real statistics derived purely from genuine stored user records
  const statistics = useMemo(() => {
    const total = history.length;
    const leukemiaRecords = history.filter((h) => h.module === 'leukemia');
    const myelomaRecords = history.filter((h) => h.module === 'myeloma');

    const leukemiaCount = leukemiaRecords.length;
    const myelomaCount = myelomaRecords.length;

    const bAllCases = leukemiaRecords.filter((h) => h.isHighRisk).length;
    const normalLeukemiaCases = leukemiaRecords.filter((h) => !h.isHighRisk).length;

    const suspectedMyelomaCases = myelomaRecords.filter((h) => h.isHighRisk).length;
    const nonMyelomaCases = myelomaRecords.filter((h) => !h.isHighRisk).length;

    const totalHighRisk = history.filter((h) => h.isHighRisk).length;

    return {
      total,
      leukemiaCount,
      myelomaCount,
      bAllCases,
      normalLeukemiaCases,
      suspectedMyelomaCases,
      nonMyelomaCases,
      totalHighRisk,
      recent: history.slice(0, 5),
    };
  }, [history]);

  const value = {
    history,
    addRecord,
    deleteRecord,
    clearHistory,
    getRecord,
    statistics,
  };

  return (
    <AnalysisHistoryContext.Provider value={value}>
      {children}
    </AnalysisHistoryContext.Provider>
  );
};

export const useAnalysisHistory = () => {
  const context = useContext(AnalysisHistoryContext);
  if (!context) {
    throw new Error('useAnalysisHistory must be used within an AnalysisHistoryProvider');
  }
  return context;
};
