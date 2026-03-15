import { VirtualFile } from '../../data/vfs/VirtualFile';
import { DataStream } from '../../data/DataStream';
import { StorageQuotaError } from '../../data/vfs/StorageQuotaError';
import { Replay } from '../../network/gamestate/Replay';
import { ReplayStorageError } from './ReplayStorageError';
import { ReplayMeta } from './ReplayMeta';

declare const THREE: {
  Math: {
    generateUUID(): string;
  };
};

interface VirtualFileSystemDirectory {
  containsEntry(fileName: string): Promise<boolean>;
  openFile(fileName: string): Promise<VirtualFile>;
  writeFile(file: VirtualFile): Promise<void>;
  deleteFile(fileName: string): Promise<void>;
  getEntries(): AsyncIterable<string>;
  getRawFiles(): AsyncIterable<{ name: string; lastModified: number }>;
  getRawFile(fileName: string): Promise<string>;
}

interface SentryService {
  captureException(error: Error, callback?: (event: any) => any): void;
}

export class ReplayStorageFileSystem {
  public static readonly manifestFileName = '_index.json';
  public static readonly unsavedReplayPrefix = 'Unsaved_';

  constructor(
    private dir: VirtualFileSystemDirectory,
    private sentry?: SentryService
  ) {}

  async getManifest(rebuild: boolean = false): Promise<ReplayMeta[]> {
    if (rebuild) {
      return await this.rebuildManifest();
    }

    if (!(await this.dir.containsEntry(ReplayStorageFileSystem.manifestFileName))) {
      return [];
    }

    const manifestContent = (
      await this.dir.openFile(ReplayStorageFileSystem.manifestFileName)
    ).readAsString('utf-8');

    if (!manifestContent.length) {
      return [];
    }

    try {
      return JSON.parse(manifestContent);
    } catch (error) {
      console.error('Replay manifest is corrupt', error);
      this.sentry?.captureException(
        error as Error,
        (event) => {
          event.addAttachment({
            filename: ReplayStorageFileSystem.manifestFileName,
            data: manifestContent,
          });
          return event;
        }
      );
      await this.deleteManifest();
      return await this.rebuildManifest();
    }
  }

  async saveManifest(manifest: ReplayMeta[]): Promise<void> {
    const stream = new DataStream();
    stream.writeString(JSON.stringify(manifest), 'utf-8');
    const file = new VirtualFile(stream, ReplayStorageFileSystem.manifestFileName);

    try {
      await this.dir.writeFile(file);
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        throw error;
      }
      throw new ReplayStorageError(
        `Failed to save manifest (${(error as Error).message})`,
        { cause: error as Error }
      );
    }
  }

  async deleteManifest(): Promise<void> {
    await this.dir.deleteFile(ReplayStorageFileSystem.manifestFileName);
  }

  async rebuildManifest(): Promise<ReplayMeta[]> {
    const currentManifest = await this.getManifest();
    let replayFileCount = 0;

    // Count replay files
    for await (const entry of this.dir.getEntries()) {
      if (entry.endsWith(Replay.extension)) {
        replayFileCount++;
      }
    }

    if (replayFileCount === currentManifest.length) {
      return currentManifest;
    }

    console.info('Rebuilding replay index...');

    const replayFiles = new Map<string, { name: string; lastModified: number }>();
    for await (const file of this.dir.getRawFiles()) {
      if (file.name.endsWith(Replay.extension)) {
        replayFiles.set(file.name, file);
      }
    }

    const newManifest: ReplayMeta[] = [];

    // Keep existing entries that still have files
    for (const entry of currentManifest) {
      const fileName = this.getReplayFileName(entry);
      if (replayFiles.has(fileName)) {
        newManifest.push(entry);
        replayFiles.delete(fileName);
      }
    }

    if (currentManifest.length - newManifest.length > 0) {
      console.info(
        `Removed ${currentManifest.length - newManifest.length} orphaned entries from index`
      );
    }

    // Add new files
    if (replayFiles.size > 0) {
      for (const file of replayFiles.values()) {
        const timestamp = file.lastModified;
        newManifest.unshift({
          id: THREE.MathUtils.generateUUID(),
          name: file.name
            .replace(ReplayStorageFileSystem.unsavedReplayPrefix, '')
            .replace(Replay.extension, ''),
          keep: !file.name.startsWith(ReplayStorageFileSystem.unsavedReplayPrefix),
          timestamp: timestamp,
        });
      }

      newManifest.sort((a, b) =>
        a.timestamp === b.timestamp
          ? a.name.localeCompare(b.name)
          : b.timestamp - a.timestamp
      );

      console.info(`Added ${replayFiles.size} new entries to replay index`);
    }

    try {
      await this.saveManifest(newManifest);
    } catch (error) {
      if (!(error instanceof StorageQuotaError)) {
        throw error;
      }
      console.error(
        'Failed to save rebuilt manifest because storage is full',
        error
      );
    }

    console.info('Rebuild finished.');
    return newManifest;
  }

  async deleteAllReplays(): Promise<void> {
    for await (const entry of this.dir.getEntries()) {
      if (entry.endsWith(Replay.extension)) {
        await this.dir.deleteFile(entry);
      }
    }
    await this.deleteManifest();
  }

  async getReplayData(meta: ReplayMeta): Promise<string> {
    const fileName = this.getReplayFileName(meta);
    if (!(await this.dir.containsEntry(fileName))) {
      throw new Error(`Replay file "${fileName}" not found.`);
    }
    return await this.dir.getRawFile(fileName);
  }

  async hasReplayData(meta: ReplayMeta): Promise<boolean> {
    const fileName = this.getReplayFileName(meta);
    return await this.dir.containsEntry(fileName);
  }

  async saveReplayData(meta: ReplayMeta, data: string): Promise<void> {
    const stream = new DataStream();
    stream.writeString(data, 'utf-8');
    const fileName = this.getReplayFileName(meta);
    const file = new VirtualFile(stream, fileName);

    try {
      await this.dir.writeFile(file);
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new ReplayStorageError(
          `Failed to save replay file "${fileName}" (${(error as Error).message})`,
          { cause: error as Error }
        );
      }
      throw new ReplayStorageError(
        `Failed to save replay file (${(error as Error).message})`,
        { cause: error as Error }
      );
    }
  }

  async deleteReplayData(meta: ReplayMeta): Promise<void> {
    await this.dir.deleteFile(this.getReplayFileName(meta));
  }

  getReplayFileName(meta: ReplayMeta): string {
    return (
      (meta.keep ? '' : ReplayStorageFileSystem.unsavedReplayPrefix) +
      meta.name +
      Replay.extension
    );
  }
}
