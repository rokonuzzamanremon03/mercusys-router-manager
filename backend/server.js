require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const ROUTER_IP = process.env.ROUTER_IP || '192.168.0.1';
const ROUTER_USERNAME = process.env.ROUTER_USERNAME || 'admin';
const ROUTER_PASSWORD = process.env.ROUTER_PASSWORD || 'admin';

let sessionCookie = null; // Store router session cookie here

// Helper: login to router and store session cookie
async function loginToRouter(username, password) {
  const loginUrl = `http://${ROUTER_IP}/userRpm/LoginRpm.htm?Save=Save`;
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  try {
    const response = await axios.post(loginUrl, params, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302,
    });

    const cookies = response.headers['set-cookie'];
    if (!cookies) throw new Error('No cookies received from router');

    // Find Authorization cookie (session cookie)
    const authCookie = cookies.find((c) => c.startsWith('Authorization='));
    if (!authCookie) throw new Error('Authorization cookie not found');

    sessionCookie = authCookie.split(';')[0]; // e.g. Authorization=xxxx
    return true;
  } catch (err) {
    throw new Error('Login failed: ' + err.message);
  }
}

// Middleware to check login
function requireLogin(req, res, next) {
  if (!sessionCookie) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// API: Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    await loginToRouter(username, password);
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// API: Logout
app.post('/api/logout', (req, res) => {
  sessionCookie = null;
  res.json({ success: true });
});

// API: Get connected devices
app.get('/api/devices', requireLogin, async (req, res) => {
  try {
    const url = `http://${ROUTER_IP}/userRpm/AssignedIpAddrListRpm.htm`;
    const response = await axios.get(url, {
      headers: { Cookie: sessionCookie },
    });

    const $ = cheerio.load(response.data);
    const devices = [];

    $('#assignedIpAddrList tr').each((i, el) => {
      if (i === 0) return; // skip header row
      const tds = $(el).find('td');
      if (tds.length < 3) return;

      devices.push({
        ip: $(tds[0]).text().trim(),
        mac: $(tds[1]).text().trim(),
        name: $(tds[2]).text().trim(),
      });
    });

    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices: ' + err.message });
  }
});

// API: Block device by MAC
app.post('/api/block', requireLogin, async (req, res) => {
  const { mac } = req.body;
  if (!mac) return res.status(400).json({ error: 'MAC address required' });

  try {
    const blacklistUrl = `http://${ROUTER_IP}/userRpm/MacFilterRpm.htm`;
    const page = await axios.get(blacklistUrl, {
      headers: { Cookie: sessionCookie },
    });
    const $ = cheerio.load(page.data);

    const existingMacs = [];
    $('#macFilterList tr').each((i, el) => {
      if (i === 0) return;
      const macText = $(el).find('td').eq(0).text().trim();
      if (macText) existingMacs.push(macText);
    });

    if (!existingMacs.includes(mac)) existingMacs.push(mac);

    const formUrl = `http://${ROUTER_IP}/userRpm/MacFilterRpm.htm?Save=Save`;
    const params = new URLSearchParams();
    params.append('macFilterEnable', '1');
    params.append('macFilterMode', 'deny');

    existingMacs.forEach((m, i) => {
      params.append(`macFilterList${i}`, m);
    });

    await axios.post(formUrl, params, {
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json({ success: true, blockedMac: mac });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block device: ' + err.message });
  }
});

// API: Unblock device by MAC
app.post('/api/unblock', requireLogin, async (req, res) => {
  const { mac } = req.body;
  if (!mac) return res.status(400).json({ error: 'MAC address required' });

  try {
    const blacklistUrl = `http://${ROUTER_IP}/userRpm/MacFilterRpm.htm`;
    const page = await axios.get(blacklistUrl, {
      headers: { Cookie: sessionCookie },
    });
    const $ = cheerio.load(page.data);

    const existingMacs = [];
    $('#macFilterList tr').each((i, el) => {
      if (i === 0) return;
      const macText = $(el).find('td').eq(0).text().trim();
      if (macText && macText.toLowerCase() !== mac.toLowerCase()) existingMacs.push(macText);
    });

    const formUrl = `http://${ROUTER_IP}/userRpm/MacFilterRpm.htm?Save=Save`;
    const params = new URLSearchParams();
    params.append('macFilterEnable', existingMacs.length > 0 ? '1' : '0');
    params.append('macFilterMode', 'deny');

    existingMacs.forEach((m, i) => {
      params.append(`macFilterList${i}`, m);
    });

    await axios.post(formUrl, params, {
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json({ success: true, unblockedMac: mac });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock device: ' + err.message });
  }
});

// API: Get WiFi info (SSID)
app.get('/api/wifi', requireLogin, async (req, res) => {
  try {
    const url = `http://${ROUTER_IP}/userRpm/WlanNetworkRpm.htm`;
    const response = await axios.get(url, {
      headers: { Cookie: sessionCookie },
    });

    const $ = cheerio.load(response.data);

    const ssid = $('input[name="ssid"]').val() || '';

    res.json({ ssid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch WiFi info: ' + err.message });
  }
});

// API: Change WiFi password
app.post('/api/wifi/password', requireLogin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const url = `http://${ROUTER_IP}/userRpm/WlanSecurityRpm.htm`;
    const page = await axios.get(url, {
      headers: { Cookie: sessionCookie },
    });
    const $ = cheerio.load(page.data);

    const encryption = $('select[name="encryption"]').val() || 'psk2';
    const ssid = $('input[name="ssid"]').val() || '';

    const formUrl = `http://${ROUTER_IP}/userRpm/WlanSecurityRpm.htm?Save=Save`;
    const params = new URLSearchParams();
    params.append('encryption', encryption);
    params.append('key', password);
    params.append('ssid', ssid);

    await axios.post(formUrl, params, {
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change WiFi password: ' + err.message });
  }
});

// API: Get bandwidth stats
app.get('/api/bandwidth', requireLogin, async (req, res) => {
  try {
    const url = `http://${ROUTER_IP}/userRpm/StatusRpm.htm`;
    const response = await axios.get(url, {
      headers: { Cookie: sessionCookie },
    });

    const $ = cheerio.load(response.data);

    // Adjust selectors based on your router's page structure
    const download = $('#downloadSpeed').text() || 'N/A';
    const upload = $('#uploadSpeed').text() || 'N/A';

    res.json({ download, upload });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bandwidth stats: ' + err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});
                               
