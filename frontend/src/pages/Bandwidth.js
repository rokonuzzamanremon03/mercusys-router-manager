import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Bandwidth() {
  const [download, setDownload] = useState('Loading...');
  const [upload, setUpload] = useState('Loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBandwidth() {
      try {
        const res = await axios.get('/api/bandwidth');
        setDownload(res.data.download || 'N/A');
        setUpload(res.data.upload || 'N/A');
      } catch (err) {
        setError('Failed to fetch bandwidth data');
        setDownload('N/A');
        setUpload('N/A');
      }
    }

    fetchBandwidth();

    // Optionally refresh bandwidth data every 10 seconds
    const interval = setInterval(fetchBandwidth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Bandwidth Usage</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-2">
        <div>
          <strong>Download Speed:</strong> {download}
        </div>
        <div>
          <strong>Upload Speed:</strong> {upload}
        </div>
      </div>
    </div>
  );
}
