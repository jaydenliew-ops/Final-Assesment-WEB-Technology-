'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const db = require('./database');
const config = require('./config');
const authenticate = require('./authMiddleware');
const { asyncRoute, HttpError } = require('./lib/errors');
const validate = require('./lib/validation');
const { listOwnReservations } = require('./services/reservations');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { status: 'error', message: 'Too many attempts. Please try again in 15 minutes.' } });

router.post('/register', limiter, asyncRoute(async (req, res) => {
  const name = validate.text(req.body.name, 'Full name', 100);
  const email = validate.email(req.body.email);
  const password = validate.password(req.body.password);
  const phone = validate.text(req.body.phone, 'Phone', 30, false);
  const hash = await bcrypt.hash(password, 12);
  try {
    await db.execute('INSERT INTO buyers (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)', [name, email, hash, phone || null]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'This email address is already registered.');
    throw err;
  }
  res.status(201).json({ status: 'success', message: 'Registration successful. Please log in.' });
}));

// A dummy hash avoids skipping bcrypt entirely for unknown addresses.
const dummyHash = bcrypt.hashSync('not-a-real-user-password', 12);

router.post('/login', limiter, asyncRoute(async (req, res) => {
  const email = validate.email(req.body.email);
  const password = validate.password(req.body.password, false);
  const [rows] = await db.execute('SELECT buyer_id AS id, full_name AS name, email, role, password_hash FROM buyers WHERE email = ?', [email]);
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : dummyHash);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password.');
  const token = jwt.sign({ id: user.id }, config.secret, { algorithm: 'HS256', expiresIn: '2h', issuer: 'housing-sales', audience: 'housing-web' });
  delete user.password_hash;
  res.json({ status: 'success', token, user });
}));

router.get('/me', authenticate, (req, res) => res.json({ status: 'success', user: req.user }));

router.post('/reset-password', limiter, (req, res) => res.status(503).json({ status: 'error', message: 'Password recovery is unavailable until verified email recovery is configured. Contact the administrator.' }));

router.get('/my-reservations', authenticate, asyncRoute(listOwnReservations));


router.post('/properties', authenticate, asyncRoute(async (req, res) => {
  const { project_name, unit_number, price_myr, latitude, longitude } = req.body;

  if (!project_name || !unit_number || !price_myr || price_myr <= 0) {
    throw new HttpError(400, 'Enter a project, unit number and positive price.');
  }

  await db.execute(
    'INSERT INTO property_units (project_name, unit_number, price_myr, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, "available")',
    [project_name, unit_number, price_myr, latitude || null, longitude || null]
  );

  res.status(201).json({ status: 'success', message: 'Property added successfully.' });
}));


router.post('/properties/pay-reservation', authenticate, asyncRoute(async (req, res) => {
  const { reservation_id } = req.body;
  const buyerId = req.user.id;

  const [reservations] = await db.execute(
    'SELECT * FROM reservations WHERE reservation_id = ? AND buyer_id = ? AND status = "pending"',
    [reservation_id, buyerId]
  );
  if (reservations.length === 0) {
    throw new HttpError(404, 'Pending reservation not found or unauthorized.');
  }

  const reservation = reservations[0];

  await db.execute('UPDATE reservations SET status = "confirmed" WHERE reservation_id = ?', [reservation_id]);
  await db.execute('UPDATE property_units SET status = "sold" WHERE unit_id = ?', [reservation.unit_id]);

  res.json({ status: 'success', message: 'Booking fee paid successfully. Reservation confirmed.' });
}));


router.post('/properties/cancel-reservation', authenticate, asyncRoute(async (req, res) => {
  const { reservation_id } = req.body;
  const buyerId = req.user.id;

  const [reservations] = await db.execute(
    'SELECT * FROM reservations WHERE reservation_id = ? AND buyer_id = ? AND status = "pending"',
    [reservation_id, buyerId]
  );
  if (reservations.length === 0) {
    throw new HttpError(404, 'Pending reservation not found or unauthorized.');
  }

  const reservation = reservations[0];

  await db.execute('UPDATE reservations SET status = "cancelled" WHERE reservation_id = ?', [reservation_id]);
  await db.execute('UPDATE property_units SET status = "available" WHERE unit_id = ?', [reservation.unit_id]);

  res.json({ status: 'success', message: 'Pending reservation cancelled.' });
}));

module.exports = router;