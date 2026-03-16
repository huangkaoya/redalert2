import { ReplayMeta } from './ReplayMeta';
export class ReplayStorageMemStorage {
    private replays = new Map<string, string>();
    private manifest?: string;
    async getManifest(): Promise<ReplayMeta[]> {
        return this.manifest ? JSON.parse(this.manifest) : [];
    }
    async saveManifest(manifest: ReplayMeta[]): Promise<void> {
        this.manifest = JSON.stringify(manifest);
    }
    async getReplayData(meta: ReplayMeta): Promise<string> {
        const data = this.replays.get(meta.id);
        if (!data) {
            throw new Error(`Replay "${meta.id}" not found in memory`);
        }
        return data;
    }
    async hasReplayData(meta: ReplayMeta): Promise<boolean> {
        return this.replays.has(meta.id);
    }
    async saveReplayData(meta: ReplayMeta, data: string): Promise<void> {
        this.replays.set(meta.id, data);
    }
    async deleteReplayData(meta: ReplayMeta): Promise<void> {
        this.replays.delete(meta.id);
    }
}
