import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Devices from './pages/Devices';
import WifiSettings from './pages/WifiSettings';
import Bandwidth from './pages/Bandwidth';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/devices" element={<PrivateRoute><Devices /></PrivateRoute>} />
            <Route path="/wifi-settings" element={<PrivateRoute><WifiSettings /></PrivateRoute>} />
            <Route path="/bandwidth" element={<PrivateRoute><Bandwidth /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/devices" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
