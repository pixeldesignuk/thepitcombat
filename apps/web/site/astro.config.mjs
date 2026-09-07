import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });

const publicUrl = new URL(process.env.PUBLIC_SITE_URL || 'http://localhost:4321');
const allowedDomains = [{ protocol: publicUrl.protocol.replace(':', ''), hostname: publicUrl.hostname, port: publicUrl.port }];
if (['localhost', '127.0.0.1'].includes(publicUrl.hostname)) {
  allowedDomains.push({ ...allowedDomains[0], hostname: publicUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost' });
}

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  devToolbar: { enabled: false },
  security: { allowedDomains },
});
