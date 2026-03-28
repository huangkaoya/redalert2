import { DataStream } from '@/data/DataStream';

/** Binary magic bytes: "RA2R" */
const REPLAY_MAGIC = 0x52324152;
/** Current replay format version */
const REPLAY_FORMAT_VERSION = 1;

export interface ActionRecord {
    tick: number;
    playerId: number;
    actionType: number;
    data: Uint8Array;
}

export const enum ReplayEventType {
    Chat = 1,
    Taunt = 2,
}

export interface ReplayEventRecord {
    tick: number;
    type: ReplayEventType;
    playerId: number;
    payload: string;
}

export interface HashCheckpoint {
    tick: number;
    hash: number;
}

export interface ReplayHeader {
    gameId: string;
    gameTimestamp: number;
    engineVersion: string;
    modHash: string;
    gameOptsSerialized: string;
}

export class Replay {
    public static readonly extension = '.ra2replay';

    public name?: string;
    public timestamp: number = 0;
    public gameId: string = '';
    public gameTimestamp: number = 0;
    public gameOpts: any;
    public engineVersion: string = '';
    public modHash: string = '';
    public finishedTick: number = 0;

    public actionRecords: ActionRecord[] = [];
    public eventRecords: ReplayEventRecord[] = [];
    public hashCheckpoints: HashCheckpoint[] = [];

    get endTick(): number {
        return this.finishedTick;
    }

    public static sanitizeFileName(filename: string): string {
        return filename.replace(/[<>:"/\\|?*]/g, '_');
    }

    finish(currentTick: number): void {
        this.finishedTick = currentTick;
    }

    serialize(): string {
        const ds = new DataStream();

        // Header
        ds.writeUint32(REPLAY_MAGIC);
        ds.writeUint16(REPLAY_FORMAT_VERSION);
        ds.writeUtf8WithLen(this.engineVersion);
        ds.writeUtf8WithLen(this.modHash);
        ds.writeUtf8WithLen(this.gameId);
        ds.writeUint32(Math.floor(this.gameTimestamp / 1000));
        ds.writeUint32(this.finishedTick);
        ds.writeFloat64(this.timestamp);

        // GameOpts as JSON
        const gameOptsJson = JSON.stringify(this.toSerializableValue(this.gameOpts));
        ds.writeUtf8WithLen(gameOptsJson);

        // Replay name
        ds.writeUtf8WithLen(this.name ?? '');

        // Action records
        ds.writeUint32(this.actionRecords.length);
        for (const record of this.actionRecords) {
            ds.writeUint32(record.tick);
            ds.writeUint8(record.playerId);
            ds.writeUint8(record.actionType);
            ds.writeUint16(record.data.length);
            ds.writeUint8Array(record.data);
        }

        // Event records
        ds.writeUint32(this.eventRecords.length);
        for (const event of this.eventRecords) {
            ds.writeUint32(event.tick);
            ds.writeUint8(event.type);
            ds.writeUint8(event.playerId);
            ds.writeUtf8WithLen(event.payload);
        }

        // Hash checkpoints
        ds.writeUint32(this.hashCheckpoints.length);
        for (const cp of this.hashCheckpoints) {
            ds.writeUint32(cp.tick);
            ds.writeUint32(cp.hash);
        }

        // Convert to base64 string for storage
        const bytes = ds.toUint8Array();
        return this.uint8ArrayToBase64(bytes);
    }

    unserialize(data: string, meta?: { name?: string; timestamp?: number }): void {
        const bytes = this.base64ToUint8Array(data);
        const ds = new DataStream(bytes.buffer as ArrayBuffer, bytes.byteOffset);

        // Header
        const magic = ds.readUint32();
        if (magic !== REPLAY_MAGIC) {
            throw new Error('Invalid replay file: bad magic');
        }
        const version = ds.readUint16();
        if (version > REPLAY_FORMAT_VERSION) {
            throw new Error(`Unsupported replay version: ${version}`);
        }

        this.engineVersion = ds.readUtf8WithLen();
        this.modHash = ds.readUtf8WithLen();
        this.gameId = ds.readUtf8WithLen();
        this.gameTimestamp = ds.readUint32() * 1000;
        this.finishedTick = ds.readUint32();
        this.timestamp = ds.readFloat64();

        // GameOpts
        const gameOptsJson = ds.readUtf8WithLen();
        this.gameOpts = JSON.parse(gameOptsJson);

        // Name (from file or embedded)
        const embeddedName = ds.readUtf8WithLen();
        this.name = meta?.name ?? embeddedName;
        if (meta?.timestamp !== undefined) {
            this.timestamp = meta.timestamp;
        }

        // Action records
        const actionCount = ds.readUint32();
        this.actionRecords = [];
        for (let i = 0; i < actionCount; i++) {
            const tick = ds.readUint32();
            const playerId = ds.readUint8();
            const actionType = ds.readUint8();
            const dataLength = ds.readUint16();
            const actionData = ds.readUint8Array(dataLength);
            this.actionRecords.push({ tick, playerId, actionType, data: actionData });
        }

        // Event records
        const eventCount = ds.readUint32();
        this.eventRecords = [];
        for (let i = 0; i < eventCount; i++) {
            const tick = ds.readUint32();
            const type = ds.readUint8() as ReplayEventType;
            const playerId = ds.readUint8();
            const payload = ds.readUtf8WithLen();
            this.eventRecords.push({ tick, type, playerId, payload });
        }

        // Hash checkpoints
        const cpCount = ds.readUint32();
        this.hashCheckpoints = [];
        for (let i = 0; i < cpCount; i++) {
            const tick = ds.readUint32();
            const hash = ds.readUint32();
            this.hashCheckpoints.push({ tick, hash });
        }
    }

    async parseHeader(data: string | Blob): Promise<ReplayHeader> {
        const serialized = typeof data === 'string'
            ? data
            : await data.text();
        const bytes = this.base64ToUint8Array(serialized);
        const ds = new DataStream(bytes.buffer as ArrayBuffer, bytes.byteOffset);

        const magic = ds.readUint32();
        if (magic !== REPLAY_MAGIC) {
            throw new Error('Invalid replay file: bad magic');
        }
        const version = ds.readUint16();
        if (version > REPLAY_FORMAT_VERSION) {
            throw new Error(`Unsupported replay version: ${version}`);
        }

        const engineVersion = ds.readUtf8WithLen();
        const modHash = ds.readUtf8WithLen();
        const gameId = ds.readUtf8WithLen();
        const gameTimestamp = ds.readUint32() * 1000;
        ds.readUint32();
        ds.readFloat64();
        const gameOptsSerialized = ds.readUtf8WithLen();

        return {
            gameId,
            gameTimestamp,
            engineVersion,
            modHash,
            gameOptsSerialized,
        };
    }

    private uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private toSerializableValue(value: any, seen: WeakSet<object> = new WeakSet()): any {
        if (value === null || value === undefined) {
            return value;
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.toSerializableValue(item, seen));
        }
        if (typeof value !== 'object') {
            return undefined;
        }
        if (value instanceof Uint8Array) {
            return Array.from(value);
        }
        if (seen.has(value)) {
            return undefined;
        }
        seen.add(value);
        const result: Record<string, any> = {};
        for (const [key, entry] of Object.entries(value)) {
            const serialized = this.toSerializableValue(entry, seen);
            if (serialized !== undefined) {
                result[key] = serialized;
            }
        }
        seen.delete(value);
        return result;
    }

    private base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}
