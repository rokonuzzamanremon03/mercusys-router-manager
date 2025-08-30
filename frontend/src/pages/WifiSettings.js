import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function WifiSettings() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchWifi() {
      try {
        const res = await axios.get('/api/wifi');
        setSsid(res.data.ssid || '');
      } catch (err) {
        setMessage('Failed to load WiFi info');
      }
    }
    fetchWifi();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await axios.post('/api/wifi/password', { password });
      setMessage('WiFi password updated successfully');
      setPassword('');
    } catch (err) {
      setMessage('Failed to update WiFi password');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">WiFi Settings</h2>
      <p><strong>SSID:</strong> {ssid}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block mb-1">New WiFi Password:</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Change Password
        </button>
      </form>
      {message && <p className="mt-4 text-red-600">{message}</p>}
    </div>
  );
      }
  
