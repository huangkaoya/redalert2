/**
 * Room manager — creates, finds, and destroys game rooms.
 */

import { RoomConfig, RoomInfo, MsgType } from '../src/network/multiplayer/protocol';
import { MessageCodec } from '../src/network/multiplayer/MessageCodec';
import { ClientConnection } from './ClientConnection';
import { Room } from './Room';
import { ServerConfig } from './config';

let roomCounter = 0;

function generateRoomId(): string {
  roomCounter++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `${ts}-${rnd}-${roomCounter}`;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private onLog: (level: string, msg: string) => void;
  private maxRooms: number;

  constructor(config: ServerConfig, onLog: (level: string, msg: string) => void) {
    this.maxRooms = config.maxRooms;
    this.onLog = (level, msg) => onLog(level, `[RoomManager] ${msg}`);
  }

  /** Create a new room. */
  createRoom(config: RoomConfig, host: ClientConnection): { room?: Room; error?: string } {
    if (this.rooms.size >= this.maxRooms) {
      return { error: 'Server is at maximum room capacity' };
    }

    if (host.roomId) {
      return { error: 'Already in a room' };
    }

    const roomId = generateRoomId();
    const room = new Room(
      roomId,
      config,
      host,
      this.onLog,
      (id) => this.removeRoom(id),
    );

    this.rooms.set(roomId, room);
    this.onLog('info', `Room created: ${roomId} by ${host.playerName} (map: ${config.mapTitle})`);

    return { room };
  }

  /** Join an existing room. */
  joinRoom(roomId: string, conn: ClientConnection, password?: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.checkPassword(password)) {
      return { success: false, error: 'Invalid password' };
    }

    return room.addPlayer(conn);
  }

  /** Leave current room. */
  leaveRoom(conn: ClientConnection): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    if (room) {
      room.removePlayer(conn.id);
    }
    conn.roomId = null;
  }

  /** Handle disconnect. */
  handleDisconnect(conn: ClientConnection): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    if (room) {
      room.removePlayer(conn.id);
    }
  }

  /** Try to reconnect a player. */
  tryReconnect(conn: ClientConnection, roomId: string, lastTick: number, token: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    return room.tryReconnect(conn, lastTick, token);
  }

  /** Get room by ID. */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Get room a connection belongs to. */
  getRoomForConnection(conn: ClientConnection): Room | undefined {
    if (!conn.roomId) return undefined;
    return this.rooms.get(conn.roomId);
  }

  /** List all available rooms (public). */
  listRooms(): RoomInfo[] {
    const rooms: RoomInfo[] = [];
    for (const [, room] of this.rooms) {
      rooms.push(room.getRoomInfo());
    }
    return rooms;
  }

  /** Remove a room. */
  private removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.dispose();
      this.rooms.delete(roomId);
      this.onLog('info', `Room removed: ${roomId}`);
    }
  }

  /** Clear all rooms (used for LAN reset). */
  clearAllRooms(): number {
    const count = this.rooms.size;
    for (const [, room] of this.rooms) {
      room.dispose();
    }
    this.rooms.clear();
    this.onLog('info', `Cleared all ${count} rooms`);
    return count;
  }

  /** Get stats. */
  getStats(): { roomCount: number; totalPlayers: number } {
    let totalPlayers = 0;
    for (const [, room] of this.rooms) {
      totalPlayers += room.getPlayerCount();
    }
    return { roomCount: this.rooms.size, totalPlayers };
  }

  /** Cleanup all rooms. */
  dispose(): void {
    for (const [, room] of this.rooms) {
      room.dispose();
    }
    this.rooms.clear();
  }
}
