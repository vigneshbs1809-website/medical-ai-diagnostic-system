import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BackendProvider } from './context/BackendContext';
import { AnalysisHistoryProvider } from './context/AnalysisHistoryContext';
import AppLayout from './components/layout/AppLayout';

import OverviewPage from './pages/OverviewPage';
import LeukemiaPage from './pages/LeukemiaPage';
import MyelomaPage from './pages/MyelomaPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import ModelInfoPage from './pages/ModelInfoPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BackendProvider>
      <AnalysisHistoryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="leukemia" element={<LeukemiaPage />} />
              <Route path="myeloma" element={<MyelomaPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="models" element={<ModelInfoPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AnalysisHistoryProvider>
    </BackendProvider>
  );
}
