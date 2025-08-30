import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
    } catch {}
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between">
      <div className="font-bold text-lg">Mercusys MW325R Manager</div>
      <div className="space-x-4">
        {isAuthenticated ? (
          <>
            <Link to="/devices" className="hover:underline">Devices</Link>
            <Link to="/wifi-settings" className="hover:underline">WiFi Settings</Link>
            <Link to="/bandwidth" className="hover:underline">Bandwidth</Link>
            <button onClick={handleLogout} className="hover:underline">Logout</button>
          </>
        ) : (
          <Link to="/login" className="hover:underline">Login</Link>
        )}
      </div>
    </nav>
  );
}
