require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const feynmanRoutes = require('./routes/feynman');
const doubtRoutes = require('./routes/doubt.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', service: 'Brain Bytes API' }));
app.get('/', (req, res) => res.status(200).json({ status: 'ok', message: 'Brain Bytes API is running' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/feynman', feynmanRoutes);
app.use('/api/feynman', feynmanRoutes);
app.use('/api/v1/doubts', doubtRoutes);
app.use('/api/doubts', doubtRoutes);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Brain Bytes API server running on port ${PORT}`));
}

module.exports = app;
