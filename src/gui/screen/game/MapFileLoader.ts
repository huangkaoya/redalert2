import { FileNotFoundError } from '@/data/vfs/FileNotFoundError';
import { VirtualFile } from '@/data/vfs/VirtualFile';
export class MapFileLoader {
    constructor(private resourceLoader: any, private vfs?: any) { }
    async load(filename: string, cancellationToken?: any): Promise<VirtualFile> {
        let mapFile: VirtualFile | undefined;
        if (this.vfs) {
            try {
                mapFile = await this.vfs.openFileWithRfs(filename);
            }
            catch (error) {
                if (!(error instanceof FileNotFoundError)) {
                    console.error(error);
                }
            }
        }
        if (!mapFile) {
            const bytes = await this.resourceLoader.loadBinary(filename, cancellationToken);
            mapFile = VirtualFile.fromBytes(bytes, filename);
        }
        return mapFile;
    }
}
