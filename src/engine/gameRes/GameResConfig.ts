import { GameResSource } from './GameResSource';
export class GameResConfig {
    private defaultCdnBaseUrl: string;
    public source?: GameResSource;
    public cdnUrl?: string;
    constructor(defaultCdnBaseUrl: string) {
        this.defaultCdnBaseUrl = defaultCdnBaseUrl;
    }
    unserialize(serializedConfig: string): void {
        const parts = serializedConfig.split(",");
        const sourceNum = Number(parts[0]);
        if (!(sourceNum in GameResSource)) {
            throw new Error(`Unknown game res source type number: "${sourceNum}"`);
        }
        this.source = sourceNum as GameResSource;
        this.cdnUrl = parts[1] ? decodeURIComponent(parts[1]) : undefined;
    }
    serialize(): string {
        if (this.source === undefined) {
            throw new Error("GameResConfig source is undefined, cannot serialize.");
        }
        let serialized = String(this.source);
        if (this.cdnUrl) {
            serialized += "," + encodeURIComponent(this.cdnUrl);
        }
        return serialized;
    }
    isCdn(): boolean {
        return this.source === GameResSource.Cdn;
    }
    getCdnBaseUrl(): string | undefined {
        return this.cdnUrl ?? this.defaultCdnBaseUrl;
    }
}
