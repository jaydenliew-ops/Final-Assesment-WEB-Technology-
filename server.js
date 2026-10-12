const config = require('./config');
const app = require('./app');
const db = require('./database');
const { expireReservations } = require('./services/reservations');
let server;
let timer;
let checking = false;
async function checkExpiration() {
  if (checking) return;
  checking = true;
  try { await expireReservations(); }
  catch (err) { console.error('Reservation cleanup failed:', err.code || err.name); }
  finally { checking = false; }
}
async function start() {
  await db.execute('SELECT role FROM buyers LIMIT 1');
  await db.execute('SELECT expires_at FROM unit_reservations LIMIT 1');
  await checkExpiration();
  server = app.listen(config.port, () => console.log(`Housing Sales Management: http://localhost:${config.port}`));
  timer = setInterval(checkExpiration, 60 * 1000);
  timer.unref();
}
async function shutdown() {
  clearInterval(timer);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  if (server) await new Promise(resolve => server.close(resolve));
  await db.end();
  clearTimeout(forceExit);
}
process.once('SIGTERM', () => shutdown().catch(() => process.exit(1)));
process.once('SIGINT', () => shutdown().catch(() => process.exit(1)));
start().catch(async err => {
  console.error('Startup failed. Check database settings and apply migrations:', err.code || err.message);
  await db.end();
  process.exitCode = 1;
});
