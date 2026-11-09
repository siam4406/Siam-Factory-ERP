import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { initDBv2 } from './database/db.v2.js';
import { seedDatabase } from './database/seed.js';
import { MainLayout } from './layouts/MainLayout.jsx';
import { Toast } from './components/UI.jsx';
import { SplashScreen, LoginPage } from './pages/Auth.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { OrdersV2 as Orders } from './pages/Orders.v2.jsx';
import { Materials } from './pages/Materials.jsx';
import { Production } from './pages/Production.v2.jsx';
import { EnhancedCapProduction } from './pages/CapProduction.v2.jsx';
import { Inventory, Expenses } from './pages/Operations.jsx';
import { SalesV2 as Sales } from './pages/Sales.v2.jsx';
import { Machines, AppSettings } from './pages/Management.jsx';
import { AdvancedReports } from './pages/Reports.v2.jsx';
import { ProfitCalculator } from './components/AlertsPanel.jsx';
import { ScrapManagement } from './pages/ScrapManagement.jsx';
import { InventoryMovements } from './pages/InventoryMovements.jsx';
import { CustomerLedger } from './pages/CustomerLedger.jsx';
import { ActivityLog } from './pages/ActivityLog.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { GlobalSearch } from './pages/GlobalSearch.jsx';
import { BusinessRulesSettings } from './pages/BusinessRulesSettings.jsx';
import { EnhancedBackup } from './pages/EnhancedBackup.jsx';

const DBInit = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initDBv2();
        await seedDatabase();
        setReady(true);
      } catch (e) {
        console.error('DB init failed:', e);
        setErr(e.message || 'Database error');
      }
    })();
  }, []);

  if (err) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <p className="text-red-400 font-bold text-lg">Database Error</p>
        <p className="text-gray-400 text-sm">{err}</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
          Reload App
        </button>
      </div>
    </div>
  );

  if (!ready) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Initialising database…</p>
    </div>
  );

  return children;
};

const AppRouter = () => {
  const { isAuthenticated, isLoading, toast } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
  if (isLoading)  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <LoginPage />;

  return (
    <>
      <Toast toast={toast} />
      <MainLayout>
        <Routes>
          <Route path="/"               index  element={<Dashboard />} />
          <Route path="/orders"                element={<Orders />} />
          <Route path="/customers"             element={<CustomerLedger />} />
          <Route path="/materials"             element={<Materials />} />
          <Route path="/production"            element={<Production />} />
          <Route path="/cap-production"        element={<EnhancedCapProduction />} />
          <Route path="/inventory"             element={<Inventory />} />
          <Route path="/sales"                 element={<Sales />} />
          <Route path="/expenses"              element={<Expenses />} />
          <Route path="/machines"              element={<Machines />} />
          <Route path="/reports"               element={<AdvancedReports />} />
          <Route path="/profit"                element={<ProfitCalculator />} />
          <Route path="/scrap"                 element={<ScrapManagement />} />
          <Route path="/movements"             element={<InventoryMovements />} />
          <Route path="/activity"              element={<ActivityLog />} />
          <Route path="/notifications"         element={<NotificationsPage />} />
          <Route path="/search"                element={<GlobalSearch />} />
          <Route path="/rules"                 element={<BusinessRulesSettings />} />
          <Route path="/backup"                element={<EnhancedBackup />} />
          <Route path="/settings"              element={<AppSettings />} />
          <Route path="*"                      element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <DBInit>
          <AppRouter />
        </DBInit>
      </AppProvider>
    </BrowserRouter>
  );
}
