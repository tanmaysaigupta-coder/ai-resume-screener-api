const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-resume-screener-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
