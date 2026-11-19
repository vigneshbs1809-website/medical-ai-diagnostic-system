import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';

export default function AppLayout() {
  const location = useLocation();

  const getPageMeta = (pathname) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Clinical Diagnostic Dashboard',
          subtitle: 'Dual deep-learning hematology decision support overview and system status',
        };
      case '/leukemia':
        return {
          title: 'Leukemia (B-ALL) Single-Cell Classification',
          subtitle: 'Cytological blast evaluation powered by audited EfficientNet-B3 architecture',
        };
      case '/myeloma':
        return {
          title: 'Multiple Myeloma Detection & Plasmacytosis Counter',
          subtitle: 'Bone marrow aspirate cellular analysis powered by YOLO26m end-to-end detector',
        };
      case '/history':
        return {
          title: 'Analysis Records & History',
          subtitle: 'Verifiable database of all executed cytological and histological evaluations',
        };
      case '/reports':
        return {
          title: 'Clinical Diagnostic Reports',
          subtitle: 'Structured diagnostic records and printable PDF medical documentation',
        };
      case '/models':
        return {
          title: 'Neural Network Architectures & Model Audit',
          subtitle: 'Audited model weights, benchmark metrics, input resolutions, and training metadata',
        };
      case '/settings':
        return {
          title: 'System Configuration & Controls',
          subtitle: 'API endpoints, backend health monitor, and local data persistence settings',
        };
      default:
        return {
          title: 'Medical AI Diagnostic Platform',
          subtitle: 'Hematological Decision Support Suite',
        };
    }
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="flex h-screen bg-medical-bg overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header title={meta.title} subtitle={meta.subtitle} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
