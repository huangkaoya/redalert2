import { Format3 } from "./encoding/Format3";
import { ShpImage } from "./ShpImage";
import { VirtualFile } from "./vfs/VirtualFile";
import { DataStream } from "./DataStream";
interface ShpFrameHeader {
    x: number;
    y: number;
    width: number;
    height: number;
    compressionType: number;
    imageDataStartOffset: number;
}
export class ShpFile {
    public width: number = 0;
    public height: number = 0;
    public numImages: number = 0;
    public images: ShpImage[] = [];
    public filename?: string;
    static fromVirtualFile(file: VirtualFile): ShpFile {
        const shpFile = new ShpFile();
        shpFile.fromVirtualFile(file);
        return shpFile;
    }
    constructor(file?: VirtualFile) {
        if (file instanceof VirtualFile) {
            this.fromVirtualFile(file);
        }
    }
    private fromVirtualFile(file: VirtualFile): void {
        this.filename = file.filename;
        const s = file.stream as DataStream;
        const reserved = s.readInt16();
        if (reserved === 0) {
            this.width = s.readInt16();
            this.height = s.readInt16();
            this.numImages = s.readInt16();
        }
        else {
            s.seek(0);
            this.numImages = s.readUint16();
            console.warn(`ShpFile ${this.filename}: Non-standard SHP header (reserved field was ${reserved}). Attempting to read as potentially TS-like format.`);
            this.width = 0;
            this.height = 0;
        }
        if (this.numImages <= 0 || this.numImages > 4096) {
            console.error(`ShpFile ${this.filename}: Invalid number of images: ${this.numImages}. Stopping parse.`);
            this.numImages = 0;
            return;
        }
        const frameHeaders: ShpFrameHeader[] = [];
        const frameHeaderBaseOffset = s.position;
        const frameDescriptorSize = 2 + 2 + 2 + 2 + 1 + 3 + 4 + 4 + 4;
        for (let i = 0; i < this.numImages; ++i) {
            frameHeaders.push(this.readFrameHeader(s));
        }
        this.images = [];
        let maxWidth = 0;
        let maxHeight = 0;
        for (let i = 0; i < this.numImages; ++i) {
            const header = frameHeaders[i];
            const { x, y, width: frameWidth, height: frameHeight, compressionType, imageDataStartOffset } = header;
            let nextOffset: number;
            if (i < this.numImages - 1) {
                nextOffset = frameHeaders[i + 1].imageDataStartOffset;
            }
            else {
                s.seek(0);
                nextOffset = s.byteLength;
            }
            if (nextOffset < imageDataStartOffset) {
                nextOffset = s.byteLength;
            }
            let imageDataLength = nextOffset - imageDataStartOffset;
            if (imageDataStartOffset + imageDataLength > s.byteLength) {
                imageDataLength = s.byteLength - imageDataStartOffset;
            }
            if (imageDataLength <= 0 && !(frameWidth === 0 && frameHeight === 0)) {
                console.warn(`ShpFile ${this.filename}, frame ${i}: Zero or negative image data length (${imageDataLength}) for non-empty frame dimensions (${frameWidth}x${frameHeight}). Skipping frame data read.`);
                const emptyImage = new ShpImage(new Uint8Array(0), frameWidth, frameHeight, x, y);
                this.images.push(emptyImage);
                maxWidth = Math.max(maxWidth, x + frameWidth);
                maxHeight = Math.max(maxHeight, y + frameHeight);
                continue;
            }
            s.seek(imageDataStartOffset);
            const imageData = this.readImageData(s, frameWidth, frameHeight, compressionType, imageDataLength);
            const image = new ShpImage(imageData, frameWidth, frameHeight, x, y);
            this.images.push(image);
            maxWidth = Math.max(maxWidth, x + frameWidth);
            maxHeight = Math.max(maxHeight, y + frameHeight);
        }
        if (reserved !== 0) {
            this.width = maxWidth;
            this.height = maxHeight;
        }
    }
    private readFrameHeader(s: DataStream): ShpFrameHeader {
        const x = s.readInt16();
        const y = s.readInt16();
        const width = s.readInt16();
        const height = s.readInt16();
        const compressionType = s.readUint8();
        s.readUint8();
        s.readUint8();
        s.readUint8();
        s.readInt32();
        s.readInt32();
        const imageDataStartOffset = s.readInt32();
        return {
            x,
            y,
            width,
            height,
            compressionType,
            imageDataStartOffset,
        };
    }
    private readImageData(s: DataStream, width: number, height: number, compressionType: number, expectedLength: number): Uint8Array {
        const uncompressedSize = width * height;
        if (uncompressedSize === 0)
            return new Uint8Array(0);
        if (expectedLength <= 0 && compressionType > 1) {
            console.warn(`ShpFile: readImageData called with expectedLength ${expectedLength} for compressed type ${compressionType}`);
            return new Uint8Array(uncompressedSize);
        }
        if (compressionType <= 1) {
            const bytesToRead = Math.min(expectedLength, uncompressedSize);
            if (s.position + bytesToRead > s.byteLength) {
                console.error(`ShpFile: Not enough data in stream to read uncompressed image. Pos: ${s.position}, Need: ${bytesToRead}, Total: ${s.byteLength}`);
                return new Uint8Array(uncompressedSize);
            }
            const data = s.readUint8Array(bytesToRead);
            if (bytesToRead < uncompressedSize) {
                const paddedData = new Uint8Array(uncompressedSize);
                paddedData.set(data);
                return paddedData;
            }
            return data;
        }
        else if (compressionType === 2) {
            const decodedData = new Uint8Array(uncompressedSize);
            let destIndex = 0;
            for (let i = 0; i < height; ++i) {
                if (s.position + 2 > s.byteLength)
                    break;
                const lineRunLength = s.readUint16() - 2;
                if (lineRunLength < 0 || s.position + lineRunLength > s.byteLength)
                    break;
                const lineData = s.readUint8Array(lineRunLength);
                if (destIndex + lineRunLength <= uncompressedSize) {
                    decodedData.set(lineData, destIndex);
                }
                destIndex += lineRunLength;
            }
            return decodedData;
        }
        else if (compressionType === 3) {
            if (s.position + expectedLength > s.byteLength) {
                console.error(`ShpFile: Not enough data for Format3 block. Pos: ${s.position}, Expected: ${expectedLength}, Total: ${s.byteLength}`);
                return new Uint8Array(uncompressedSize);
            }
            const compressedData = s.readUint8Array(expectedLength);
            return Format3.decode(compressedData, width, height);
        }
        console.warn(`ShpFile: Unknown compression type ${compressionType}`);
        return new Uint8Array(uncompressedSize);
    }
    getImage(index: number): ShpImage {
        if (index < 0 || index >= this.images.length) {
            throw new RangeError(`Image index out of bounds (file=${this.filename}, index=${index}, numImages=${this.numImages}, images.length=${this.images.length})`);
        }
        return this.images[index];
    }
    addImage(image: ShpImage): void {
        this.images.push(image);
        this.numImages = this.images.length;
        this.width = Math.max(this.width, image.x + image.width);
        this.height = Math.max(this.height, image.y + image.height);
    }
    clip(newWidth: number, newHeight: number): ShpFile {
        const clippedFile = new ShpFile();
        clippedFile.filename = this.filename;
        clippedFile.width = newWidth;
        clippedFile.height = newHeight;
        clippedFile.images = this.images.map((img) => img.clip(newWidth, newHeight));
        clippedFile.numImages = this.images.length;
        return clippedFile;
    }
}
