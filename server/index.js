const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Server port
const PORT = process.env.PORT || 3001;

// Data storage directory
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`Data directory ensured at ${DATA_DIR}`);
  } catch (error) {
    console.error('Error creating data directory:', error);
    process.exit(1);
  }
}

// File paths for different data types
const getFilePath = (type) => path.join(DATA_DIR, `${type}.json`);

// Read data from file
async function readData(type) {
  try {
    const data = await fs.readFile(getFilePath(type), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty data
      return null;
    }
    console.error(`Error reading ${type} data:`, error);
    throw error;
  }
}

// Write data to file
async function writeData(type, data) {
  try {
    const dataStr = JSON.stringify(data, null, 2);
    await fs.writeFile(getFilePath(type), dataStr, 'utf8');
    console.log(`${type} data saved`);
  } catch (error) {
    console.error(`Error writing ${type} data:`, error);
    throw error;
  }
}

// Initialize server with middleware
app.use(bodyParser.json());
app.use(cors());

// Create default data files if they don't exist
async function initializeDataFiles() {
  // Default dashboard settings
  const defaultSettings = {
    title: 'Services Dashboard',
    subtitle: 'Access all your local services in one place',
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff'
  };

  // Default auth settings
  const defaultAuthSettings = {
    isEnabled: false,
    username: '',
    password: ''
  };

  // Initialize files if they don't exist
  const files = [
    { type: 'links', default: { links: [] } },
    { type: 'links_order', default: { order: [] } },
    { type: 'dashboard_settings', default: defaultSettings },
    { type: 'auth_settings', default: defaultAuthSettings }
  ];

  for (const file of files) {
    try {
      const data = await readData(file.type);
      if (data === null) {
        await writeData(file.type, file.default);
        console.log(`Initialized ${file.type} with default data`);
      }
    } catch (error) {
      console.error(`Error initializing ${file.type}:`, error);
    }
  }
}

// ===== API Routes =====

// --- Dashboard Settings ---
app.get('/api/dashboard/settings', async (req, res) => {
  try {
    const settings = await readData('dashboard_settings');
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard settings' });
  }
});

app.put('/api/dashboard/settings', async (req, res) => {
  try {
    await writeData('dashboard_settings', req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save dashboard settings' });
  }
});

// --- Links ---
app.get('/api/links', async (req, res) => {
  try {
    const data = await readData('links');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get links' });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const data = await readData('links');
    const newLink = req.body;
    
    // Add to links
    data.links.push(newLink);
    await writeData('links', data);
    
    // Add to order
    const orderData = await readData('links_order');
    orderData.order.push(newLink.id);
    await writeData('links_order', orderData);
    
    res.status(201).json(newLink);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add link' });
  }
});

app.put('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData('links');
    
    const index = data.links.findIndex(link => link.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    data.links[index] = req.body;
    await writeData('links', data);
    
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update link' });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData('links');
    
    const index = data.links.findIndex(link => link.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Remove from links
    data.links.splice(index, 1);
    await writeData('links', data);
    
    // Remove from order
    const orderData = await readData('links_order');
    orderData.order = orderData.order.filter(linkId => linkId !== id);
    await writeData('links_order', orderData);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// --- Links Order ---
app.get('/api/links/order', async (req, res) => {
  try {
    const data = await readData('links_order');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get links order' });
  }
});

app.put('/api/links/order', async (req, res) => {
  try {
    const { order } = req.body;
    await writeData('links_order', { order });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save links order' });
  }
});

// --- Auth Settings ---
app.get('/api/auth/settings', async (req, res) => {
  try {
    const settings = await readData('auth_settings');
    // Don't send the password back to the client
    const { password, ...safeSettings } = settings;
    res.json({
      ...safeSettings,
      password: password ? '********' : '' // Mask the password
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get auth settings' });
  }
});

app.put('/api/auth/settings', async (req, res) => {
  try {
    const currentSettings = await readData('auth_settings');
    
    // If the password is masked, keep the original
    if (req.body.password === '********') {
      req.body.password = currentSettings.password;
    }
    
    await writeData('auth_settings', req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save auth settings' });
  }
});

// --- Auth Login ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const settings = await readData('auth_settings');
    
    // If auth is disabled, return success
    if (!settings.isEnabled) {
      return res.json({ success: true, token: 'disabled' });
    }
    
    // Check credentials
    if (username === settings.username && password === settings.password) {
      // Generate a simple token (in a real app, use a proper JWT)
      const token = Date.now().toString();
      return res.json({ success: true, token });
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Auth Verify ---
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const settings = await readData('auth_settings');
    
    // If auth is disabled, token is always valid
    if (!settings.isEnabled) {
      return res.json({ valid: true });
    }
    
    // In a real app, you would verify the token properly
    // For this demo, any token is considered valid
    if (token) {
      return res.json({ valid: true });
    }
    
    res.json({ valid: false });
  } catch (error) {
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Start the server
async function startServer() {
  try {
    await ensureDataDir();
    await initializeDataFiles();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`Data directory: ${DATA_DIR}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 