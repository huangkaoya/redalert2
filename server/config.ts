/**
 * Server configuration with LAN and public network support.
 */

export interface ServerConfig {
  /** 'lan' for local hosting, 'public' for internet deployment */
  mode: 'lan' | 'public';

  /** WebSocket listen port */
  port: number;

  /** Hostname to bind (0.0.0.0 for all interfaces) */
  host: string;

  /** TLS certificate path (optional, enables HTTPS/WSS when provided) */
  tlsCert?: string;

  /** TLS key path (optional, enables HTTPS/WSS when provided) */
  tlsKey?: string;

  /** Enable UDP LAN broadcast discovery */
  lanDiscovery: boolean;

  /** LAN broadcast port for room discovery */
  lanDiscoveryPort: number;

  /** Max rooms allowed on this server */
  maxRooms: number;

  /** Max players per room */
  maxPlayersPerRoom: number;

  /** Auth secret for JWT tokens (public mode) */
  authSecret?: string;

  /** Enable CORS */
  corsOrigin: string;

  /** Heartbeat interval ms */
  heartbeatInterval: number;

  /** Heartbeat timeout ms */
  heartbeatTimeout: number;

  /** Reconnect window ms */
  reconnectWindow: number;

  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function getDefaultConfig(mode: 'lan' | 'public' = 'lan'): ServerConfig {
  return {
    mode,
    port: mode === 'lan' ? 9527 : 443,
    host: '0.0.0.0',
    lanDiscovery: mode === 'lan',
    lanDiscoveryPort: 9528,
    maxRooms: mode === 'lan' ? 4 : 100,
    maxPlayersPerRoom: 8,
    corsOrigin: mode === 'lan' ? '*' : '',
    heartbeatInterval: 1000,
    heartbeatTimeout: 3000,
    reconnectWindow: 60000,
    logLevel: mode === 'lan' ? 'debug' : 'info',
  };
}
