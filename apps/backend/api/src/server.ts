import { settings } from './config.js';
import { createPool, createStore, migrate } from './db.js';
import { createApp } from './app.js';
import { startOutbox } from './outbox.js';

const pool = createPool(settings.databaseUrl);
await migrate(pool);
const app = createApp({ store: createStore(pool), origins: settings.origins, adminToken: settings.adminToken, logger: true });
const stopOutbox = startOutbox(pool, settings, message => app.log.warn(message));
app.addHook('onClose', async () => { await stopOutbox(); await pool.end(); });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
await app.listen({ port: settings.port, host: '0.0.0.0' });
