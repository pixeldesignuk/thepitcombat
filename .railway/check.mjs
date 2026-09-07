import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRailwayContext, project, RAILWAY_GRAPH_VERSION, validateGraph } from 'railway/iac';
import configure from './railway.ts';

// Offline checks inspect symbolic configuration only: no credentials or API calls.
const definition = await configure(createRailwayContext({
  command: 'plan', projectName: 'thepit', environment: 'development',
}), project);
const resources = definition.resources.flat(Infinity);
assert.equal(definition.name, 'thepit');
assert.deepEqual(definition.environments, ['development']);
assert.deepEqual(validateGraph({
  version: RAILWAY_GRAPH_VERSION,
  project: { name: definition.name },
  environments: [{ name: 'development' }],
  resources,
  edges: [],
}), []);

const expectedApps = new Map([
  ['api', 'apps/backend/api/Dockerfile'],
  ['auth', 'apps/backend/auth/Dockerfile'],
  ['website', 'apps/web/site/Dockerfile'],
  ['dash', 'apps/web/dash/Dockerfile'],
]);
for (const [name, dockerfile] of expectedApps) {
  const app = resources.find(item => item.name === name);
  assert.ok(app, `Missing ${name}`);
  assert.equal(app.source.rootDirectory, '/');
  assert.equal(app.build.builder, 'DOCKERFILE');
  assert.equal(app.build.dockerfilePath, dockerfile);
  assert.ok(existsSync(new URL(`../${dockerfile}`, import.meta.url)));
  assert.ok(app.build.buildCommand == null);
  assert.ok(app.deploy.startCommand == null);
  assert.equal(app.deploy.healthcheckPath, '/healthz');
  assert.equal(app.deploy.healthcheckTimeout, 120);
  assert.ok(app.deploy.restartPolicyType == null); // Railway default: On Failure.
  assert.ok(app.deploy.restartPolicyMaxRetries == null); // Railway default: 10.
  assert.equal(Object.values(app.deploy.multiRegionConfig).reduce((sum, region) => sum + region.numReplicas, 0), 1);
}
const api = resources.find(item => item.name === 'api');
assert.deepEqual(api.deploy.preDeployCommand, ['node apps/backend/api/dist/migrate.js']);
const db = resources.find(item => item.name === 'Postgres');
const dbVolume = resources.find(item => item.name === 'postgres-volume');
assert.equal(db.image, 'ghcr.io/railwayapp-templates/postgres-ssl:18');
assert.equal(dbVolume.config.sizeMB, 50000);
assert.equal(dbVolume.config.region, 'us-east4-eqdc4a');
assert.equal(db.deploy.requiredMountPath, '/var/lib/postgresql/data');
assert.ok(Object.values(db.variables).every(value => value.type === 'preserve'));
for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'REPLY_TO_EMAIL']) {
  assert.equal(api.variables[key].type, 'preserve', `${key} must remain Railway-managed`);
}
const auth = resources.find(item => item.name === 'auth');
assert.equal(auth.variables.BETTER_AUTH_SECRET.type, 'preserve');
assert.equal(auth.variables.SEED_ADMIN_PASSWORD.type, 'preserve');
assert.ok(!api.variables.ADMIN_API_TOKEN);
assert.equal(api.variables.AUTH_INTERNAL_URL.value, 'http://${{auth.RAILWAY_PRIVATE_DOMAIN}}:3000');
for (const environment of ['production', 'dev', undefined]) {
  assert.throws(() => configure(createRailwayContext({ projectName: 'thepit', environment }), project));
}
assert.throws(() => configure(createRailwayContext({ projectName: 'another-project', environment: 'development' }), project));
console.log('Railway configuration checks passed: SDK types/graph, Docker paths, migration, remote secret preservation and project/environment guards.');
