/**
 * Binary codec for player actions in multiplayer lockstep.
 * Format: [count: uint8] [action0] [action1] ...
 * Each action: [id: uint16LE] [paramLen: uint16LE] [params: uint8[paramLen]]
 */
export class PlayerActionCodec {
  serializePlayerActions(actions: Array<{ id: number; params: Uint8Array }>): Uint8Array {
    if (actions.length === 0) return new Uint8Array([0]);

    let totalSize = 1; // count byte
    for (const a of actions) {
      totalSize += 2 + 2 + a.params.byteLength;
    }

    const buf = new Uint8Array(totalSize);
    const view = new DataView(buf.buffer);
    buf[0] = actions.length;
    let offset = 1;
    for (const a of actions) {
      view.setUint16(offset, a.id, true); offset += 2;
      view.setUint16(offset, a.params.byteLength, true); offset += 2;
      buf.set(a.params, offset); offset += a.params.byteLength;
    }
    return buf;
  }

  parsePlayerActions(data: Uint8Array): Array<{ id: number; params: Uint8Array }> {
    if (data.byteLength === 0 || (data.byteLength === 1 && data[0] === 0)) return [];

    const view = new DataView(data.buffer, data.byteOffset);
    const count = data[0];
    const actions: Array<{ id: number; params: Uint8Array }> = [];
    let offset = 1;
    for (let i = 0; i < count; i++) {
      const id = view.getUint16(offset, true); offset += 2;
      const len = view.getUint16(offset, true); offset += 2;
      const params = data.slice(offset, offset + len); offset += len;
      actions.push({ id, params });
    }
    return actions;
  }
}
