require('dotenv').config();
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace-with-')) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in .env.');
}
if (process.env.NODE_ENV === 'production' && process.env.DEMO_PAYMENTS === 'true') {
  throw new Error('DEMO_PAYMENTS must be false in production.');
}
module.exports = {
  secret,
  demoPayments: process.env.DEMO_PAYMENTS === 'true',
  port: Number(process.env.PORT || 3000)
};
