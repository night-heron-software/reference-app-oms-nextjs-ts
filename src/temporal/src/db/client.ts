import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

let connectionString = process.env.DATABASE_URL || 'postgres://default:';
console.log(`${JSON.stringify(process.env, null, 2)}`);
// Configuring Neon for local development
if (process.env.USE_LOCAL_DATABASE === 'true') {
  connectionString = 'postgres://postgres:postgres@db.localtest.me:5432/main';
  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };
  const connectionStringUrl = new URL(connectionString);
  neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
  neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
}
neonConfig.webSocketConstructor = ws;

// Neon supports both HTTP and WebSocket clients. Choose the one that fits your needs:

// HTTP Client (sql)
// - Best for serverless functions and Lambda environments
// - Ideal for stateless operations and quick queries
// - Lower overhead for single queries
// - Better for applications with sporadic database access
export const sql = neon(connectionString);

// WebSocket Client (pool)
// - Best for long-running applications (like servers)
// - Maintains a persistent connection
// - More efficient for multiple sequential queries
// - Better for high-frequency database operations
export const pool = new Pool({ connectionString });
