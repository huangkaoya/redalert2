/**
 * LAN room discovery via UDP broadcast.
 * Servers broadcast their presence; clients listen and discover rooms.
 */

import * as dgram from 'dgram';
import { RoomInfo, DEFAULT_LAN_PORT } from '../src/network/multiplayer/protocol';

const BROADCAST_MAGIC = 'RA2LAN';
const BROADCAST_INTERVAL = 2000;

export class LanDiscovery {
  private socket: dgram.Socket | null = null;
  private broadcastTimer: ReturnType<typeof setInterval> | null = null;
  private port: number;
  private serverPort: number;
  private onLog: (level: string, msg: string) => void;

  constructor(
    port: number = DEFAULT_LAN_PORT + 1,
    serverPort: number = DEFAULT_LAN_PORT,
    onLog: (level: string, msg: string) => void = () => {},
  ) {
    this.port = port;
    this.serverPort = serverPort;
    this.onLog = onLog;
  }

  /** Start broadcasting server presence on LAN. */
  startBroadcasting(getRooms: () => RoomInfo[]): void {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', (err) => {
      this.onLog('error', `LAN discovery error: ${err.message}`);
    });

    this.socket.bind(0, () => {
      this.socket!.setBroadcast(true);

      this.broadcastTimer = setInterval(() => {
        const rooms = getRooms();
        const payload = JSON.stringify({
          magic: BROADCAST_MAGIC,
          serverPort: this.serverPort,
          rooms: rooms.map(r => ({
            roomId: r.roomId,
            name: r.name,
            hostName: r.hostName,
            mapTitle: r.mapTitle,
            playerCount: r.playerCount,
            maxPlayers: r.maxPlayers,
            status: r.status,
          })),
          timestamp: Date.now(),
        });

        const buf = Buffer.from(payload, 'utf-8');
        try {
          this.socket!.send(buf, 0, buf.length, this.port, '255.255.255.255');
        } catch {
          // Ignore broadcast errors
        }
      }, BROADCAST_INTERVAL);

      this.onLog('info', `LAN discovery broadcasting on port ${this.port}`);
    });
  }

  /** Stop broadcasting. */
  stop(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch { /* ignore */ }
      this.socket = null;
    }
  }
}

/**
 * LAN discovery listener (client-side, for use in Electron or Node.js context).
 */
export class LanDiscoveryListener {
  private socket: dgram.Socket | null = null;
  private onDiscover: (serverAddr: string, serverPort: number, rooms: any[]) => void;

  constructor(
    private port: number = DEFAULT_LAN_PORT + 1,
    onDiscover: (serverAddr: string, serverPort: number, rooms: any[]) => void,
  ) {
    this.onDiscover = onDiscover;
  }

  /** Start listening for LAN broadcasts. */
  start(): void {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString('utf-8'));
        if (data.magic === BROADCAST_MAGIC) {
          this.onDiscover(rinfo.address, data.serverPort, data.rooms);
        }
      } catch {
        // Ignore invalid packets
      }
    });

    this.socket.on('error', () => {
      // Ignore errors
    });

    this.socket.bind(this.port, () => {
      this.socket!.setBroadcast(true);
    });
  }

  /** Stop listening. */
  stop(): void {
    if (this.socket) {
      try { this.socket.close(); } catch { /* ignore */ }
      this.socket = null;
    }
  }
}
