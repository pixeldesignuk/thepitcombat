import { settings } from './config.js';
import { createPool, migrate } from './db.js';

const pool = createPool(settings.databaseUrl);
try { await migrate(pool); console.log('Registration schema is ready.'); }
finally { await pool.end(); }
