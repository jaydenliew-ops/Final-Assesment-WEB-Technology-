const express = require('express');
const db = require('./database');
const config = require('./config');
const authenticate = require('./authMiddleware');
const { asyncRoute, HttpError } = require('./lib/errors');
const validate = require('./lib/validation');
const reservations = require('./services/reservations');
const router = express.Router();
const rates = Object.freeze({ MYR: 1, USD: 0.23, SGD: 0.31, CNY: 1.65 });

router.get('/', asyncRoute(async (req, res) => {
  const currency = validate.text(req.query.currency || 'MYR', 'Currency', 3).toUpperCase();
  if (!Object.hasOwn(rates, currency)) throw new HttpError(400, 'Supported currencies: MYR, USD, SGD, CNY.');
  let sql = 'SELECT * FROM housing_units WHERE 1=1';
  const args = [];
  if (req.query.project !== undefined) { sql += ' AND project_name LIKE ?'; args.push(`%${validate.text(req.query.project, 'Project', 100)}%`); }
  if (req.query.status !== undefined) {
    if (!['Available', 'Hold', 'Reserved', 'Sold'].includes(req.query.status)) throw new HttpError(400, 'Invalid property status.');
    sql += ' AND status = ?'; args.push(req.query.status);
  }
  if (req.query.bedrooms !== undefined) { sql += ' AND bedrooms = ?'; args.push(validate.id(req.query.bedrooms, 'Bedrooms')); }
  await reservations.expireReservations();
  const [rows] = await db.execute(`${sql} ORDER BY project_name, unit_number`, args);
  res.json({ status: 'success', count: rows.length, rate_type: 'indicative', data: rows.map(unit => ({ ...unit, converted_price: (Number(unit.price_myr) * rates[currency]).toFixed(2), display_currency: currency })) });
}));

router.post('/', authenticate, asyncRoute(async (req, res) => {
  const project = validate.text(req.body.project_name, 'Project name', 100);
  const unit = validate.text(req.body.unit_number, 'Unit number', 50);
  const price = validate.number(req.body.price_myr, 'Price', 0.01, 9999999999.99);
  const latitude = req.body.latitude == null ? null : validate.number(req.body.latitude, 'Latitude', -90, 90);
  const longitude = req.body.longitude == null ? null : validate.number(req.body.longitude, 'Longitude', -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new HttpError(400, 'Supply both coordinates, or leave both empty.');
  const bedrooms = req.body.bedrooms === undefined ? 2 : validate.id(req.body.bedrooms, 'Bedrooms');
  if (bedrooms > 100) throw new HttpError(400, 'Bedrooms cannot exceed 100.');
  const [result] = await db.execute("INSERT INTO housing_units (project_name, unit_number, price_myr, latitude, longitude, bedrooms, status) VALUES (?, ?, ?, ?, ?, ?, 'Available')", [project, unit, price, latitude, longitude, bedrooms]);
  res.status(201).json({ status: 'success', message: 'Property added.', unit_id: result.insertId });
}));

router.post('/reserve', authenticate, asyncRoute(async (req, res) => {
  const unitId = validate.id(req.body.unit_id, 'Unit ID');
  const details = validate.particulars(req.body);
  const data = await reservations.reserve(req.user.id, unitId, details);
  res.status(201).json({ status: 'success', message: 'Property held for 15 minutes. No money has been collected.', data });
}));

router.post('/pay-reservation', authenticate, asyncRoute(async (req, res) => {
  const id = validate.id(req.body.reservation_id, 'Reservation ID');
  if (!config.demoPayments) throw new HttpError(503, 'Payments are unavailable until a verified payment gateway is connected. No money has been collected.');
  await reservations.mutateOwnReservation(req.user.id, id, 'pay');
  res.json({ status: 'success', demo: true, message: 'DEMO ONLY: reservation confirmed. No real payment was processed.' });
}));

router.post('/cancel-reservation', authenticate, asyncRoute(async (req, res) => {
  await reservations.mutateOwnReservation(req.user.id, validate.id(req.body.reservation_id, 'Reservation ID'), 'cancel');
  res.json({ status: 'success', message: 'Pending reservation cancelled. No payment or refund was processed.' });
}));

router.post('/update-buyer-details', authenticate, asyncRoute(async (req, res) => {
  const details = validate.particulars(req.body);
  await reservations.mutateOwnReservation(req.user.id, validate.id(req.body.reservation_id, 'Reservation ID'), 'edit', details);
  res.json({ status: 'success', message: 'Buyer particulars updated.' });
}));

module.exports = router;  