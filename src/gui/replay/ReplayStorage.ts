import { ReplayMeta } from './ReplayMeta';
export interface ReplayStorage {
    getManifest(rebuild?: boolean): Promise<ReplayMeta[]>;
    saveManifest(manifest: ReplayMeta[]): Promise<void>;
    getReplayData(meta: ReplayMeta): Promise<string>;
    hasReplayData(meta: ReplayMeta): Promise<boolean>;
    saveReplayData(meta: ReplayMeta, data: string): Promise<void>;
    deleteReplayData(meta: ReplayMeta): Promise<void>;
}
