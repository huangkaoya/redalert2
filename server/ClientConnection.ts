/**
 * Client connection wrapper for the multiplayer server.
 * Handles per-connection state, heartbeat, and message buffering.
 */

import type { WebSocket } from 'ws';
import { MsgType, PlayerState, HEARTBEAT_TIMEOUT_MS } from '../src/network/multiplayer/protocol';
import { MessageCodec } from '../src/network/multiplayer/MessageCodec';

let nextConnectionId = 1;

export class ClientConnection {
  readonly id: number;
  playerName: string = '';
  playerId: number = -1;
  roomId: string | null = null;
  state: PlayerState = PlayerState.Connected;
  ping: number = 0;
  loadPercent: number = 0;
  authToken: string = '';
  reconnectToken: string = '';

  private lastHeartbeatReceived: number = Date.now();
  private lastHeartbeatSent: number = 0;
  private recvBuffer: Uint8Array = new Uint8Array(0);

  constructor(
    public readonly ws: WebSocket,
    public readonly remoteAddr: string,
  ) {
    this.id = nextConnectionId++;
    this.reconnectToken = this.generateToken();
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const arr = new Uint8Array(32);
    globalThis.crypto?.getRandomValues?.(arr) ?? arr.forEach((_, i) => arr[i] = Math.floor(Math.random() * 256));
    for (let i = 0; i < 32; i++) {
      result += chars[arr[i] % chars.length];
    }
    return result;
  }

  send(type: MsgType, payload?: Uint8Array): void {
    if (this.ws.readyState !== 1 /* OPEN */) return;
    const frame = MessageCodec.encode(type, payload);
    this.ws.send(frame);
  }

  sendJSON(type: MsgType, data: unknown): void {
    this.send(type, MessageCodec.encodeJSON(data));
  }

  sendHeartbeat(): void {
    this.lastHeartbeatSent = Date.now();
    this.send(MsgType.HEARTBEAT, MessageCodec.encodeHeartbeat(this.lastHeartbeatSent));
  }

  onHeartbeatReceived(timestamp: number): void {
    this.lastHeartbeatReceived = Date.now();
    this.ping = Math.max(0, this.lastHeartbeatReceived - timestamp);
  }

  isTimedOut(timeoutMs: number = HEARTBEAT_TIMEOUT_MS): boolean {
    return (Date.now() - this.lastHeartbeatReceived) > timeoutMs;
  }

  getTimeSinceLastHeartbeat(): number {
    return Date.now() - this.lastHeartbeatReceived;
  }

  /** Append raw data to receive buffer, decode complete messages. */
  feedData(data: Uint8Array): Array<{ type: MsgType; flags: number; payload: Uint8Array }> {
    // For WebSocket, each message is already framed, so we decode directly
    if (this.recvBuffer.byteLength > 0) {
      const combined = new Uint8Array(this.recvBuffer.byteLength + data.byteLength);
      combined.set(this.recvBuffer);
      combined.set(data, this.recvBuffer.byteLength);
      data = combined;
    }
    const { messages, remaining } = MessageCodec.decodeAll(data);
    this.recvBuffer = remaining;
    return messages;
  }

  close(code?: number, reason?: string): void {
    try {
      this.ws.close(code, reason);
    } catch {
      // ignore close errors
    }
  }

  toString(): string {
    return `[Client#${this.id} ${this.playerName || 'anonymous'}@${this.remoteAddr}]`;
  }
}
