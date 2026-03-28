/**
 * Binary message codec for multiplayer protocol.
 * Frame: [MsgType: 1B][Flags: 1B][PayloadLen: 2B][Payload: variable]
 */

import { MsgType, MsgFlag } from './protocol';

const HEADER_SIZE = 4;
const MAX_PAYLOAD_SIZE = 65536;

export class MessageCodec {
  /** Encode a message into a binary frame. */
  static encode(type: MsgType, payload: Uint8Array = new Uint8Array(0), flags: number = MsgFlag.NONE): Uint8Array {
    if (payload.byteLength > MAX_PAYLOAD_SIZE) {
      throw new RangeError(`Payload size ${payload.byteLength} exceeds max ${MAX_PAYLOAD_SIZE}`);
    }
    const frame = new Uint8Array(HEADER_SIZE + payload.byteLength);
    const view = new DataView(frame.buffer);
    view.setUint8(0, type);
    view.setUint8(1, flags);
    view.setUint16(2, payload.byteLength, true); // little-endian
    if (payload.byteLength > 0) {
      frame.set(payload, HEADER_SIZE);
    }
    return frame;
  }

  /** Decode a binary frame. Returns null if the buffer is incomplete. */
  static decode(buffer: Uint8Array): { type: MsgType; flags: number; payload: Uint8Array; bytesConsumed: number } | null {
    if (buffer.byteLength < HEADER_SIZE) {
      return null;
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const type = view.getUint8(0) as MsgType;
    const flags = view.getUint8(1);
    const payloadLen = view.getUint16(2, true);
    const totalLen = HEADER_SIZE + payloadLen;
    if (buffer.byteLength < totalLen) {
      return null;
    }
    const payload = buffer.slice(HEADER_SIZE, totalLen);
    return { type, flags, payload, bytesConsumed: totalLen };
  }

  /** Decode all complete messages from a buffer. Returns messages and remaining bytes. */
  static decodeAll(buffer: Uint8Array): { messages: Array<{ type: MsgType; flags: number; payload: Uint8Array }>; remaining: Uint8Array } {
    const messages: Array<{ type: MsgType; flags: number; payload: Uint8Array }> = [];
    let offset = 0;
    while (offset < buffer.byteLength) {
      const slice = buffer.subarray(offset);
      const result = MessageCodec.decode(slice);
      if (!result) break;
      messages.push({ type: result.type, flags: result.flags, payload: result.payload });
      offset += result.bytesConsumed;
    }
    return { messages, remaining: buffer.subarray(offset) };
  }

  // --- Payload helpers ---

  static encodeString(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  static decodeString(data: Uint8Array): string {
    return new TextDecoder().decode(data);
  }

  static encodeJSON(obj: unknown): Uint8Array {
    return MessageCodec.encodeString(JSON.stringify(obj));
  }

  static decodeJSON<T = unknown>(data: Uint8Array): T {
    return JSON.parse(MessageCodec.decodeString(data)) as T;
  }

  static encodeUint32(value: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
  }

  static decodeUint32(data: Uint8Array, offset = 0): number {
    return new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
  }

  /** Encode a heartbeat with timestamp. */
  static encodeHeartbeat(timestamp: number): Uint8Array {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setFloat64(0, timestamp, true);
    return buf;
  }

  static decodeHeartbeat(data: Uint8Array): number {
    return new DataView(data.buffer, data.byteOffset).getFloat64(0, true);
  }

  /** Encode player actions for a turn. */
  static encodePlayerActions(tick: number, actions: Uint8Array): Uint8Array {
    const buf = new Uint8Array(4 + actions.byteLength);
    new DataView(buf.buffer).setUint32(0, tick, true);
    buf.set(actions, 4);
    return buf;
  }

  static decodePlayerActions(data: Uint8Array): { tick: number; actions: Uint8Array } {
    const tick = new DataView(data.buffer, data.byteOffset).getUint32(0, true);
    const actions = data.slice(4);
    return { tick, actions };
  }

  /** Encode merged turn data (all players' actions for a tick). */
  static encodeTurnData(tick: number, playerActions: Map<number, Uint8Array>): Uint8Array {
    let totalSize = 4 + 1; // tick + playerCount
    for (const [, actions] of playerActions) {
      totalSize += 1 + 2 + actions.byteLength; // playerId + len + data
    }
    const buf = new Uint8Array(totalSize);
    const view = new DataView(buf.buffer);
    view.setUint32(0, tick, true);
    view.setUint8(4, playerActions.size);
    let offset = 5;
    for (const [playerId, actions] of playerActions) {
      view.setUint8(offset, playerId); offset += 1;
      view.setUint16(offset, actions.byteLength, true); offset += 2;
      buf.set(actions, offset); offset += actions.byteLength;
    }
    return buf;
  }

  static decodeTurnData(data: Uint8Array): { tick: number; playerActions: Map<number, Uint8Array> } {
    const view = new DataView(data.buffer, data.byteOffset);
    const tick = view.getUint32(0, true);
    const playerCount = view.getUint8(4);
    const playerActions = new Map<number, Uint8Array>();
    let offset = 5;
    for (let i = 0; i < playerCount; i++) {
      const playerId = view.getUint8(offset); offset += 1;
      const len = view.getUint16(offset, true); offset += 2;
      const actions = data.slice(offset, offset + len); offset += len;
      playerActions.set(playerId, actions);
    }
    return { tick, playerActions };
  }

  /** Encode hash report. */
  static encodeHashReport(tick: number, hash: number): Uint8Array {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setUint32(0, tick, true);
    view.setUint32(4, hash, true);
    return buf;
  }

  static decodeHashReport(data: Uint8Array): { tick: number; hash: number } {
    const view = new DataView(data.buffer, data.byteOffset);
    return { tick: view.getUint32(0, true), hash: view.getUint32(4, true) };
  }

  /** Encode reconnect request. */
  static encodeReconnect(lastTick: number, token: string): Uint8Array {
    const tokenBytes = MessageCodec.encodeString(token);
    const buf = new Uint8Array(4 + tokenBytes.byteLength);
    new DataView(buf.buffer).setUint32(0, lastTick, true);
    buf.set(tokenBytes, 4);
    return buf;
  }

  static decodeReconnect(data: Uint8Array): { lastTick: number; token: string } {
    const lastTick = new DataView(data.buffer, data.byteOffset).getUint32(0, true);
    const token = MessageCodec.decodeString(data.slice(4));
    return { lastTick, token };
  }
}
