// WebAuthn relying-party identity. Env-driven so the same build serves any host:
// local dev defaults to localhost; production sets RP_ID/ORIGIN for the deployed
// origin (e.g. trove.local). rpID is the registrable domain (no scheme/port);
// origin is the exact scheme+host(+port) the browser sees.
export const rpName = process.env.RP_NAME ?? 'Trove';
export const rpID = process.env.RP_ID ?? 'localhost';
export const origin = process.env.ORIGIN ?? 'http://localhost:3000';
