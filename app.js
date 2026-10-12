const express = require('express');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const authenticate = require('./authMiddleware');
const { asyncRoute } = require('./lib/errors');
const { listOwnReservations } = require('./services/reservations');
const app = express();
app.disable('x-powered-by');
// Existing pages use inline scripts/styles. Self-hosted assets only; migrate scripts out of HTML before enforcing nonce-based CSP.
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], scriptSrcAttr: ["'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
} }, strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '32kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use('/api', (req, res, next) => { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {}; next(); });
app.get('/api/config', (req, res) => res.json({ demo_payments: config.demoPayments }));
app.use('/api/auth', require('./routes'));
app.use('/api/properties', require('./propertyRoutes'));
app.get('/api/my-reservations', authenticate, asyncRoute(listOwnReservations));
app.get('/', (req, res) => res.redirect('/login.html'));
app.use(express.static(path.join(__dirname, 'public'), { index: false, dotfiles: 'deny' }));
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Not found.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status === 500) console.error('Request failed:', err.code || err.name);
  res.status(status).json({ status: 'error', message: status === 500 ? 'Server error. Please try again later.' : (err.type === 'entity.parse.failed' ? 'Invalid JSON request.' : err.message) });
});
module.exports = app;
