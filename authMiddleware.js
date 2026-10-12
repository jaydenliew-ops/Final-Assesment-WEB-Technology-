const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./database');
const { HttpError, asyncRoute } = require('./lib/errors');
const authenticate = asyncRoute(async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) throw new HttpError(401, 'Please log in to continue.');
  let decoded;
  try {
    decoded = jwt.verify(match[1], config.secret, { algorithms: ['HS256'], issuer: 'housing-sales', audience: 'housing-web' });
  } catch { throw new HttpError(401, 'Your login has expired. Please log in again.'); }
  if (!Number.isInteger(decoded.id) || decoded.id < 1) throw new HttpError(401, 'Invalid login.');
  const [rows] = await db.execute('SELECT buyer_id AS id, full_name AS name, email, role FROM buyers WHERE buyer_id = ?', [decoded.id]);
  if (!rows.length) throw new HttpError(401, 'Account no longer exists.');
  req.user = rows[0];
  next();
});
const requireAdmin = (req, res, next) => req.user.role === 'admin' ? next() : next(new HttpError(403, 'Administrator access is required.'));
module.exports = authenticate;
module.exports.requireAdmin = requireAdmin;
