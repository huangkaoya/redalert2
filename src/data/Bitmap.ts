export enum PixelFormat {
    Rgb = 1,
    Rgba = 2,
    Indexed = 3
}
function getBytesPerPixel(format: PixelFormat): number {
    switch (format) {
        case PixelFormat.Indexed:
            return 1;
        case PixelFormat.Rgb:
            return 3;
        case PixelFormat.Rgba:
            return 4;
        default:
            throw new Error("Unsupported pixel format " + format);
    }
}
export class Bitmap {
    public data: Uint8Array;
    public pixelFormat: PixelFormat;
    public width: number;
    public height: number;
    constructor(width: number, height: number, data?: Uint8Array, pixelFormat: PixelFormat = PixelFormat.Rgba) {
        const bytesPerPixel = getBytesPerPixel(pixelFormat);
        this.data = data || new Uint8Array(bytesPerPixel * width * height);
        if (this.data.length < bytesPerPixel * width * height && data) {
        }
        this.pixelFormat = pixelFormat;
        this.width = width;
        this.height = height;
    }
    drawIndexedImage(sourceBitmap: IndexedBitmap, x: number, y: number): void {
        const destBpp = getBytesPerPixel(this.pixelFormat);
        const destData = this.data;
        const destStride = this.width * destBpp;
        const destBufferLimit = destData.length;
        let destOffset = y * destStride + x * destBpp;
        let sourceOffset = 0;
        for (let sy = 0; sy < sourceBitmap.height; sy++) {
            let currentDestRowOffset = destOffset;
            for (let sx = 0; sx < sourceBitmap.width; sx++) {
                const sourceIndexValue = sourceBitmap.data[sourceOffset];
                if (sourceIndexValue !== 0 && currentDestRowOffset >= 0 && (currentDestRowOffset + destBpp - 1) < destBufferLimit) {
                    destData[currentDestRowOffset] = sourceIndexValue;
                    if (destBpp >= 3) {
                        destData[currentDestRowOffset + 1] = 0;
                        destData[currentDestRowOffset + 2] = 0;
                    }
                    if (destBpp === 4) {
                        destData[currentDestRowOffset + 3] = 255;
                    }
                }
                currentDestRowOffset += destBpp;
                sourceOffset++;
            }
            destOffset += destStride;
        }
    }
}
export class IndexedBitmap extends Bitmap {
    constructor(width: number, height: number, data?: Uint8Array) {
        super(width, height, data, PixelFormat.Indexed);
    }
}
export class RgbBitmap extends Bitmap {
    constructor(width: number, height: number, data?: Uint8Array) {
        super(width, height, data, PixelFormat.Rgb);
    }
}
export class RgbaBitmap extends Bitmap {
    constructor(width: number, height: number, data?: Uint8Array) {
        super(width, height, data, PixelFormat.Rgba);
    }
    drawRgbaImage(sourceBitmap: RgbaBitmap, x: number, y: number, destWidth?: number, destHeight?: number): void {
        const destData = this.data;
        const destStride = this.width * 4;
        const destBufferLimit = destData.length;
        const effectiveDestWidth = destWidth ?? sourceBitmap.width;
        const effectiveDestHeight = destHeight ?? sourceBitmap.height;
        let destOffset = y * destStride + x * 4;
        let sourceOffset = 0;
        const drawHeight = Math.min(effectiveDestHeight, sourceBitmap.height, Math.max(0, this.height - y));
        const drawWidth = Math.min(effectiveDestWidth, sourceBitmap.width, Math.max(0, this.width - x));
        for (let sy = 0; sy < drawHeight; sy++) {
            let currentDestRowOffset = destOffset;
            let currentSourceRowOffset = sourceOffset;
            for (let sx = 0; sx < drawWidth; sx++) {
                if (currentDestRowOffset >= 0 && (currentDestRowOffset + 3) < destBufferLimit) {
                    destData[currentDestRowOffset] = sourceBitmap.data[currentSourceRowOffset];
                    destData[currentDestRowOffset + 1] = sourceBitmap.data[currentSourceRowOffset + 1];
                    destData[currentDestRowOffset + 2] = sourceBitmap.data[currentSourceRowOffset + 2];
                    destData[currentDestRowOffset + 3] = sourceBitmap.data[currentSourceRowOffset + 3];
                }
                currentDestRowOffset += 4;
                currentSourceRowOffset += 4;
            }
            destOffset += destStride;
            sourceOffset += sourceBitmap.width * 4;
        }
    }
}
