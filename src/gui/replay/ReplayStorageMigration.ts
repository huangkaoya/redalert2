import { Replay } from '../../network/gamestate/Replay';
import { ReplayStorageFileSystem } from './ReplayStorageFileSystem';
import { ReplayMeta } from './ReplayMeta';

declare const THREE: {
  Math: {
    generateUUID(): string;
  };
};

interface SplashScreen {
  setLoadingText(text: string): void;
}

interface Strings {
  get(key: string, value?: number): string;
}

interface LocalPrefs {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  listItems(): string[];
}

interface VirtualFileSystemDirectory {
  containsEntry(fileName: string): Promise<boolean>;
  openFile(fileName: string): Promise<VirtualFile>;
  writeFile(file: VirtualFile): Promise<void>;
  deleteFile(fileName: string): Promise<void>;
  getEntries(): AsyncIterable<string>;
}

interface VirtualFile {
  readAsString(encoding: string): string;
  filename: string;
}

interface OldReplayMeta {
  id: string;
  name: string;
  keep: boolean;
  timestamp: number;
}

export class ReplayStorageMigration {
  public static readonly migratedMarker = '_r_replays_migrated';

  constructor(
    private splashScreen: SplashScreen,
    private strings: Strings,
    private replayDir: VirtualFileSystemDirectory,
    private localPrefs: LocalPrefs,
    private storageFileSystem: ReplayStorageFileSystem
  ) {}

  async migrate(): Promise<void> {
    if (Number(this.localPrefs.getItem(ReplayStorageMigration.migratedMarker) || 0) !== 4) {
      console.info('Running replay storage migrations...');
      await this.runMigrationTo4();
      this.localPrefs.setItem(ReplayStorageMigration.migratedMarker, '4');
      console.info('Migrations finished.');
    }
  }

  private async runMigrationTo4(): Promise<void> {
    // Clean up old localStorage entries
    this.localPrefs.removeItem('_r_replayList');
    for (const item of this.localPrefs.listItems()) {
      if (item.startsWith('_r_replay_')) {
        this.localPrefs.removeItem(item);
      }
    }

    const replayDir = this.replayDir;
    const oldManifestName = 'replays.json';

    if (await replayDir.containsEntry(oldManifestName)) {
      if (
        await replayDir.containsEntry(
          ReplayStorageFileSystem.manifestFileName
        )
      ) {
        // New manifest exists, just delete old one
        await replayDir.deleteFile(oldManifestName);
      } else {
        // Migrate from old manifest
        const oldManifestContent = (
          await replayDir.openFile(oldManifestName)
        ).readAsString('utf-8');

        let oldManifest: OldReplayMeta[] = [];
        try {
          oldManifest = JSON.parse(oldManifestContent);
        } catch (error) {
          // Ignore parse errors
        }

        if (oldManifest.length > 0) {
          this.splashScreen.setLoadingText(
            this.strings.get('ts:replay_storage_migrating', 0)
          );

          const newManifest: ReplayMeta[] = [];
          const existingFiles = new Set<string>();

          // Get list of existing replay files
          for await (const entry of replayDir.getEntries()) {
            if (entry.endsWith(Replay.extension)) {
              existingFiles.add(entry);
            }
          }

          const fileRenames = new Map<string, string>();
          const usedNames = new Set<string>();

          // Process old manifest entries
          for (const oldEntry of oldManifest) {
            const oldFileName = 'replay_' + oldEntry.id + Replay.extension;
            if (existingFiles.has(oldFileName)) {
              const newEntry: ReplayMeta = {
                id: THREE.MathUtils.generateUUID(),
                name: Replay.sanitizeFileName(oldEntry.name),
                keep: oldEntry.keep,
                timestamp: oldEntry.timestamp,
              };

              newManifest.push(newEntry);

              let newFileName = this.storageFileSystem.getReplayFileName(newEntry);
              let counter = 1;

              // Handle name conflicts
              while (usedNames.has(newFileName.toLowerCase())) {
                let baseName = newFileName.replace(Replay.extension, '');
                if (counter > 1) {
                  baseName = baseName.replace(/ \(\d+\)$/, '');
                }
                newFileName = baseName + ` (${++counter})` + Replay.extension;
              }

              if (counter > 1) {
                newEntry.name += ` (${counter})`;
              }

              fileRenames.set(oldFileName, newFileName);
              usedNames.add(newFileName.toLowerCase());
            }
          }

          await replayDir.deleteFile(oldManifestName);

          try {
            let processed = 0;
            const total = fileRenames.size;

            // Rename files
            for (const [oldName, newName] of fileRenames) {
              const file = await replayDir.openFile(oldName);
              (file as any).filename = newName;
              await replayDir.writeFile(file as any);
              await replayDir.deleteFile(oldName);

              this.splashScreen.setLoadingText(
                this.strings.get(
                  'ts:replay_storage_migrating',
                  Math.floor((++processed / total) * 100)
                )
              );
            }

            await this.storageFileSystem.saveManifest(newManifest);
          } catch (error) {
            console.error(error);
          }
        } else {
          await replayDir.deleteFile(oldManifestName);
        }
      }
    }
  }
}
