/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Personnel } from './pages/admin/Personnel';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { Attendance } from './pages/shared/Attendance';
import { Tasks } from './pages/shared/Tasks';
import { LeaveRequests } from './pages/shared/LeaveRequests';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { currentUser, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/" /> : <Login />} 
        />
        
        <Route element={currentUser ? <Layout /> : <Navigate to="/login" />}>
          <Route 
            path="/" 
            element={
              !profile ? <Navigate to="/onboarding" /> : <Dashboard />
            } 
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leave-requests" element={<LeaveRequests />} />
          
          {/* Admin specific but shared layout for now */}
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/admin/personnel" element={profile?.role === 'admin' ? <Personnel /> : <Navigate to="/" />} />
          <Route path="/employee" element={profile?.role === 'employee' ? <EmployeeDashboard /> : <Navigate to="/" />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
