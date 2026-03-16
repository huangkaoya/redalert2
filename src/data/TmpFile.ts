import { TmpImage } from "./TmpImage";
import { VirtualFile } from "./vfs/VirtualFile";
import { DataStream } from "./DataStream";
export class TmpFile {
    public images: TmpImage[] = [];
    public width: number = 0;
    public height: number = 0;
    public blockWidth: number = 0;
    public blockHeight: number = 0;
    constructor(file?: VirtualFile) {
        if (file instanceof VirtualFile) {
            this.fromVirtualFile(file);
        }
    }
    private fromVirtualFile(file: VirtualFile): void {
        const stream = file.stream as DataStream;
        this.width = stream.readInt32();
        this.height = stream.readInt32();
        this.blockWidth = stream.readInt32();
        this.blockHeight = stream.readInt32();
        const numberOfTiles = this.width * this.height;
        if (numberOfTiles <= 0)
            return;
        const imageOffsets: number[] = [];
        for (let i = 0; i < numberOfTiles; i++) {
            imageOffsets.push(stream.readInt32());
        }
        this.images = [];
        for (let i = 0; i < numberOfTiles; i++) {
            let offset = imageOffsets[i];
            if (offset < 0) {
                offset = 0;
            }
            stream.seek(offset);
            const image = new TmpImage(stream, this.blockWidth, this.blockHeight);
            this.images.push(image);
        }
    }
    public getTile(tileX: number, tileY: number): TmpImage | undefined {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return undefined;
        }
        const index = tileY * this.width + tileX;
        return this.images[index];
    }
}
