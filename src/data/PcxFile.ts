import PcxJs from '@ra2web/pcxfile';
import { CanvasUtils } from '../engine/gfx/CanvasUtils';
import type { VirtualFile } from './vfs/VirtualFile';
import { DataStream } from './DataStream';
export class PcxFile {
    public width: number;
    public height: number;
    public data: Uint8Array;
    private fileSource: VirtualFile | DataStream;
    constructor(source: VirtualFile | DataStream) {
        this.fileSource = source;
        let dataViewProvider: {
            buffer: ArrayBuffer;
            byteOffset: number;
            byteLength: number;
        };
        if ('stream' in source && source.stream instanceof DataStream) {
            const stream = source.stream;
            dataViewProvider = stream;
        }
        else if (source instanceof DataStream) {
            dataViewProvider = source;
        }
        else {
            throw new Error("PcxFile constructor: Unsupported source type.");
        }
        const pcxData = new Uint8Array(dataViewProvider.buffer, dataViewProvider.byteOffset, dataViewProvider.byteLength);
        const pcxParser = new PcxJs(pcxData);
        const decoded = pcxParser.decode();
        if (!decoded || !decoded.pixelArray) {
            throw new Error("Failed to decode PCX data.");
        }
        this.width = decoded.width;
        this.height = decoded.height;
        this.data = decoded.pixelArray;
        this.fixAlpha(this.data);
    }
    static fromVirtualFile(vf: VirtualFile): PcxFile {
        return new PcxFile(vf);
    }
    async toPngBlob(): Promise<Blob | null> {
        const canvas = this.toCanvas();
        return await CanvasUtils.canvasToBlob(canvas);
    }
    toDataUrl(): string {
        return this.toCanvas().toDataURL();
    }
    toCanvas(): HTMLCanvasElement {
        return CanvasUtils.canvasFromRgbaImageData(this.data, this.width, this.height);
    }
    private fixAlpha(rgbaPixelArray: Uint8Array | Uint8ClampedArray): void {
        for (let i = 0; i < rgbaPixelArray.length; i += 4) {
            if (rgbaPixelArray[i] === 255 &&
                rgbaPixelArray[i + 1] === 0 &&
                rgbaPixelArray[i + 2] === 255) {
                rgbaPixelArray[i + 3] = 0;
            }
        }
    }
}
