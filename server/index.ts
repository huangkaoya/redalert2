/**
 * Multiplayer game server entry point.
 * Supports both LAN and public network modes.
 *
 * Usage:
 *   LAN:    node --loader ts-node/esm server/index.ts
 *   LAN+TLS: node --loader ts-node/esm server/index.ts --mode=lan --port=9527 --cert=cert.pem --key=key.pem
 *   Public: node --loader ts-node/esm server/index.ts --mode=public --port=443 --cert=cert.pem --key=key.pem
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as url from 'url';
import { MsgType, ChatTarget } from '../src/network/multiplayer/protocol';
import { MessageCodec } from '../src/network/multiplayer/MessageCodec';
import { ClientConnection } from './ClientConnection';
import { RoomManager } from './RoomManager';
import { LanDiscovery } from './LanDiscovery';
import { AuthManager } from './AuthManager';
import { ServerConfig, getDefaultConfig } from './config';

// --- Parse CLI args ---
function parseArgs(): Partial<ServerConfig> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
    else if (arg.startsWith('--')) args[arg.slice(2)] = 'true';
  }
  return {
    mode: (args.mode as 'lan' | 'public') ?? undefined,
    port: args.port ? parseInt(args.port) : undefined,
    host: args.host ?? undefined,
    tlsCert: args.cert ?? undefined,
    tlsKey: args.key ?? undefined,
    authSecret: args.secret ?? undefined,
    logLevel: (args.loglevel as any) ?? undefined,
    maxRooms: args.maxrooms ? parseInt(args.maxrooms) : undefined,
    corsOrigin: args.cors ?? undefined,
  };
}

// --- Logger ---
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let logLevel: number = LOG_LEVELS.info;

function log(level: string, msg: string): void {
  if (LOG_LEVELS[level as keyof typeof LOG_LEVELS] >= logLevel) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${level.toUpperCase()}] ${msg}`);
  }
}

// --- Main ---
function main(): void {
  const cliArgs = parseArgs();
  const config: ServerConfig = { ...getDefaultConfig(cliArgs.mode ?? 'lan'), ...stripUndefined(cliArgs) };
  const tlsEnabled = Boolean(config.tlsCert && config.tlsKey);
  logLevel = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.info;

  log('info', `Starting server in ${config.mode} mode on ${config.host}:${config.port}`);

  // Create HTTP(S) server
  let httpServer: http.Server | https.Server;
  if (tlsEnabled) {
    httpServer = https.createServer({
      cert: fs.readFileSync(config.tlsCert),
      key: fs.readFileSync(config.tlsKey),
    });
    log('info', 'TLS enabled');
  } else {
    httpServer = http.createServer();
  }

  // REST API for room listing & auth
  const authManager = config.authSecret ? new AuthManager(config.authSecret) : null;
  const roomManager = new RoomManager(config, log);

  (httpServer as http.Server).on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    // CORS
    if (config.corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    const parsed = url.parse(req.url ?? '/', true);

    if (parsed.pathname === '/api/rooms' && req.method === 'GET') {
      const rooms = roomManager.listRooms();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rooms }));
      return;
    }

    if (parsed.pathname === '/api/auth' && req.method === 'POST' && authManager) {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { userName } = JSON.parse(body);
          if (!userName || typeof userName !== 'string' || userName.length > 32) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid userName' }));
            return;
          }
          const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const token = authManager.generateToken(userId, userName);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ token, userId }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    if (parsed.pathname === '/api/rooms/clear' && req.method === 'POST') {
      const cleared = roomManager.clearAllRooms();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, cleared }));
      return;
    }

    if (parsed.pathname === '/api/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(roomManager.getStats()));
      return;
    }

    if (parsed.pathname === '/health') {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connections = new Map<WebSocket, ClientConnection>();

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const remoteAddr = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const conn = new ClientConnection(ws, remoteAddr);
    connections.set(ws, conn);

    // Disable Nagle's algorithm
    req.socket.setNoDelay(true);

    log('debug', `Connection from ${conn}`);

    ws.on('message', (rawData: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const data = rawData instanceof ArrayBuffer
          ? new Uint8Array(rawData)
          : Buffer.isBuffer(rawData)
            ? new Uint8Array(rawData)
            : new Uint8Array(Buffer.concat(rawData as Buffer[]));
        
        const messages = conn.feedData(data);
        for (const msg of messages) {
          handleMessage(conn, msg.type, msg.payload, roomManager, authManager);
        }
      } catch (err: any) {
        log('error', `Error processing message from ${conn}: ${err.message}`);
      }
    });

    ws.on('close', () => {
      log('debug', `Disconnected: ${conn}`);
      roomManager.handleDisconnect(conn);
      connections.delete(ws);
    });

    ws.on('error', (err) => {
      log('error', `WebSocket error from ${conn}: ${err.message}`);
    });

    // Set binary type
    ws.binaryType = 'arraybuffer';
  });

  // LAN discovery
  let lanDiscovery: LanDiscovery | undefined;
  if (config.lanDiscovery) {
    lanDiscovery = new LanDiscovery(config.lanDiscoveryPort, config.port, log);
    lanDiscovery.startBroadcasting(() => roomManager.listRooms());
  }

  // Start listening
  httpServer.listen(config.port, config.host, () => {
    log('info', `Server listening on ${tlsEnabled ? 'wss' : 'ws'}://${config.host}:${config.port}/ws`);
    if (config.mode === 'lan') {
      log('info', `LAN discovery broadcasting on UDP port ${config.lanDiscoveryPort}`);
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    log('info', 'Shutting down...');
    lanDiscovery?.stop();
    roomManager.dispose();
    wss.close();
    httpServer.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// --- Message handler ---
function handleMessage(
  conn: ClientConnection,
  type: MsgType,
  payload: Uint8Array,
  roomManager: RoomManager,
  authManager: AuthManager | null,
): void {
  switch (type) {
    case MsgType.HEARTBEAT: {
      const timestamp = MessageCodec.decodeHeartbeat(payload);
      conn.onHeartbeatReceived(timestamp);
      // Echo back for RTT calculation
      conn.send(MsgType.HEARTBEAT, MessageCodec.encodeHeartbeat(timestamp));
      break;
    }

    case MsgType.AUTH_REQUEST: {
      const data = MessageCodec.decodeJSON<{ token?: string; playerName?: string }>(payload);
      
      if (authManager && data.token) {
        const authPayload = authManager.verifyToken(data.token);
        if (!authPayload) {
          conn.sendJSON(MsgType.AUTH_RESPONSE, { success: false, error: 'Invalid token' });
          return;
        }
        conn.playerName = authPayload.userName;
        conn.authToken = data.token;
      } else if (data.playerName) {
        // LAN mode: just accept the name
        if (!data.playerName || typeof data.playerName !== 'string' || data.playerName.length > 32) {
          conn.sendJSON(MsgType.AUTH_RESPONSE, { success: false, error: 'Invalid player name' });
          return;
        }
        conn.playerName = data.playerName;
      } else {
        conn.sendJSON(MsgType.AUTH_RESPONSE, { success: false, error: 'Missing credentials' });
        return;
      }

      conn.sendJSON(MsgType.AUTH_RESPONSE, {
        success: true,
        playerId: conn.id,
        playerName: conn.playerName,
        reconnectToken: conn.reconnectToken,
      });
      log('info', `Player authenticated: ${conn.playerName} (id=${conn.id})`);
      break;
    }

    case MsgType.ROOM_LIST: {
      conn.sendJSON(MsgType.ROOM_LIST, { rooms: roomManager.listRooms() });
      break;
    }

    case MsgType.CREATE_ROOM: {
      if (!conn.playerName) {
        conn.sendJSON(MsgType.CREATE_ROOM, { success: false, error: 'Not authenticated' });
        return;
      }
      const config = MessageCodec.decodeJSON<any>(payload);
      const result = roomManager.createRoom(config, conn);
      if (result.error) {
        conn.sendJSON(MsgType.CREATE_ROOM, { success: false, error: result.error });
      } else {
        conn.sendJSON(MsgType.CREATE_ROOM, { success: true, roomId: result.room!.roomId });
      }
      break;
    }

    case MsgType.JOIN_ROOM: {
      if (!conn.playerName) {
        conn.sendJSON(MsgType.JOIN_ROOM, { success: false, error: 'Not authenticated' });
        return;
      }
      const { roomId, password } = MessageCodec.decodeJSON<{ roomId: string; password?: string }>(payload);
      const result = roomManager.joinRoom(roomId, conn, password);
      conn.sendJSON(MsgType.JOIN_ROOM, result);
      break;
    }

    case MsgType.LEAVE_ROOM: {
      roomManager.leaveRoom(conn);
      conn.sendJSON(MsgType.LEAVE_ROOM, { success: true });
      break;
    }

    case MsgType.SLOT_UPDATE: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const data = MessageCodec.decodeJSON<{ slotIndex: number; action: string; data?: any }>(payload);
      // Own settings and ready apply to any player (including host)
      if (data.action === 'settings' && data.slotIndex === -1) {
        room.updatePlayerSettings(conn.id, data.data);
      } else if (data.action === 'ready') {
        room.togglePlayerReady(conn.id);
      } else if (conn.id === room.hostId) {
        // Host can manage slots (open/close/ai/settings for specific slots)
        room.updateSlot(conn.id, data.slotIndex, data.action, data.data);
      }
      break;
    }

    case MsgType.GAME_START: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const result = room.startGame(conn.id);
      if (!result.success) {
        conn.sendJSON(MsgType.GAME_START, { success: false, error: result.error });
      }
      break;
    }

    case MsgType.LOAD_PROGRESS: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const { percent } = MessageCodec.decodeJSON<{ percent: number }>(payload);
      room.reportLoadProgress(conn.id, percent);
      break;
    }

    case MsgType.PLAYER_ACTIONS: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const { tick, actions } = MessageCodec.decodePlayerActions(payload);
      room.receiveActions(conn.id, tick, actions);
      break;
    }

    case MsgType.HASH_REPORT: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const { tick, hash } = MessageCodec.decodeHashReport(payload);
      room.receiveHashReport(conn.id, tick, hash);
      break;
    }

    case MsgType.RECONNECT: {
      const { lastTick, token } = MessageCodec.decodeReconnect(payload);
      // Token format: "reconnectToken:roomId"
      const parts = token.split(':');
      const reconnectToken = parts[0];
      const roomId = parts[1];
      if (reconnectToken && roomId) {
        const result = roomManager.tryReconnect(conn, roomId, lastTick, reconnectToken);
        conn.sendJSON(MsgType.RECONNECT, result);
      } else {
        conn.sendJSON(MsgType.RECONNECT, { success: false, error: 'Invalid reconnect data' });
      }
      break;
    }

    case MsgType.CHAT: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const { message, target } = MessageCodec.decodeJSON<{ message: string; target: ChatTarget }>(payload);
      if (message && message.length <= 256) {
        room.handleChat(conn.id, message, target);
      }
      break;
    }

    case MsgType.GAME_SPEED: {
      const room = roomManager.getRoomForConnection(conn);
      if (!room) return;
      const { speed } = MessageCodec.decodeJSON<{ speed: number }>(payload);
      room.setGameSpeed(conn.id, speed);
      break;
    }

    default:
      log('warn', `Unknown message type 0x${type.toString(16)} from ${conn}`);
  }
}

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

main();
