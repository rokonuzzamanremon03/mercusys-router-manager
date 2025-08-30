import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/devices');
      setDevices(res.data.devices);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const blockDevice = async (mac) => {
  setActionLoading(mac);
  try {
    await axios.post('/api/block', { mac });
    // handle success, e.g., refresh device list
  } catch (error) {
    console.error('Failed to block device:', error);
  } finally {
    setActionLoading(null);
  }
};
