import { database, defineRailway, github, preserve, project, service, volume } from 'railway/iac';

// This is the complete intended development environment. Before applying, compare the
// live plan and import any additional existing resources/variables to preserve.
export default defineRailway((ctx) => {
  if (ctx.environment !== 'development') {
    throw new Error('This configuration targets the development environment. Link thepit / development before planning.');
  }
  if (ctx.projectName && ctx.projectName !== 'thepit') {
    throw new Error('This configuration belongs to the thepit Railway project.');
  }

  const source = () => github('pixeldesignuk/thepitcombat', { branch: 'main', rootDirectory: '/', checkSuites: false });
  const build = (dockerfilePath: string) => ({
    builder: 'DOCKERFILE' as const,
    dockerfilePath,
    buildCommand: null,
  });
  const deploy = {
    startCommand: null,
    preDeployCommand: [] as string[],
    healthcheckPath: '/healthz',
    healthcheckTimeout: 120,
    // Railway normalizes its default On Failure / 10 retries to absent fields.
    // Keep that default instead of repeatedly planning writes of the same value.
  };

  // Imported from the live development environment: retain PostgreSQL 18,
  // its existing 50 GB volume, mount path, region, variables and networking.
  const postgresVolume = volume('postgres-volume', {
    region: 'us-east4-eqdc4a',
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { '80': {}, '95': {}, '100': {} } },
  });
  const db = database('Postgres', 'postgres', {
    image: 'ghcr.io/railwayapp-templates/postgres-ssl:18',
    defaultMountPath: '/var/lib/postgresql/data',
  });
  db.build = { builder: 'RAILPACK', buildEnvironment: 'V3' };
  db.deploy = {
    ipv6EgressEnabled: false,
    multiRegionConfig: { 'us-east4-eqdc4a': { numReplicas: 1 } },
    requiredMountPath: '/var/lib/postgresql/data',
  };
  db.networking = { privateNetworkEndpoint: 'postgres', tcpProxies: { '5432': {} } };
  // The imported managed database already owns its mount. Retain the volume
  // resource without declaring a second attachment over Railway's existing one.
  db.variables = Object.fromEntries([
    'DATABASE_PUBLIC_URL', 'DATABASE_URL', 'PGDATA', 'PGDATABASE', 'PGHOST',
    'PGPASSWORD', 'PGPORT', 'PGUSER', 'POSTGRES_DB', 'POSTGRES_PASSWORD',
    'POSTGRES_USER', 'RAILWAY_DEPLOYMENT_DRAINING_SECONDS', 'SSL_CERT_DAYS',
  ].map(name => [name, preserve()]));

  const website = service('website', {
    source: source(),
    build: build('apps/web/site/Dockerfile'),
    deploy: { ...deploy, ipv6EgressEnabled: false },
    replicas: { 'europe-west4-drams3a': 1 },
    networking: { privateNetworkEndpoint: 'thepitcombat' },
    env: {
      PORT: '3000',
      API_URL: 'http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000',
      // Already-set Railway values remain remote. preserve() creates no value.
      PUBLIC_SITE_URL: preserve(),
      OPERATOR_NAME: preserve(),
      PRIVACY_EMAIL: preserve(),
      CORRESPONDENCE_ADDRESS: preserve(),
    },
  });

  const api = service('api', {
    source: source(),
    build: build('apps/backend/api/Dockerfile'),
    deploy: { ...deploy, preDeployCommand: ['node apps/backend/api/dist/migrate.js'] },
    replicas: { 'us-east4-eqdc4a': 1 },
    env: {
      PORT: '3000',
      DATABASE_URL: db.env.DATABASE_URL,
      PUBLIC_SITE_URL: website.env.PUBLIC_SITE_URL,
      DASH_URL: preserve(),
      ADMIN_API_TOKEN: preserve(),
      RESEND_API_KEY: preserve(),
      RESEND_FROM_EMAIL: preserve(),
      REPLY_TO_EMAIL: preserve(),
    },
  });

  const dash = service('dash', {
    source: source(),
    build: build('apps/web/dash/Dockerfile'),
    deploy,
    replicas: { 'us-east4-eqdc4a': 1 },
    env: {
      PORT: '3000',
      VITE_API_URL: preserve(),
    },
  });

  return project('thepit', { environments: ['development'], resources: [postgresVolume, db, website, api, dash] });
});
