import React, { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import PlanManagers from './pages/PlanManagers';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import BankAccounts from './pages/BankAccounts';
import ProfitExpenses from './pages/ProfitExpenses';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import { supabase } from './service/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import PlanManagerDetail from './pages/PlanManagerDetail';

function PrivateRoute({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const location = useLocation();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar onLogout={handleLogout} />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px' }}>{children}</main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <AppLayout>
                <Customers />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/plan-managers"
          element={
            <PrivateRoute>
              <AppLayout>
                <PlanManagers />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/plan-managers/:id"
          element={
            <PrivateRoute>
              <AppLayout>
                <PlanManagerDetail />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <PrivateRoute>
              <AppLayout>
                <Subscriptions />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <AppLayout>
                <Payments />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/bank-accounts"
          element={
            <PrivateRoute>
              <AppLayout>
                <BankAccounts />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/profit-expenses"
          element={
            <PrivateRoute>
              <AppLayout>
                <ProfitExpenses />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
