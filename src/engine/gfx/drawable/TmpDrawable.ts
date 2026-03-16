import { IndexedBitmap } from '@/data/Bitmap';
interface TileData {
    tileData: number[];
    x: number;
    y: number;
    extraX?: number;
    extraY?: number;
    hasExtraData?: boolean;
    extraWidth?: number;
    extraHeight?: number;
    extraData?: number[];
}
export class TmpDrawable {
    drawTileBlock(tile: TileData, bitmap: IndexedBitmap, width: number, height: number, offsetX: number, offsetY: number): void {
        const data = bitmap.data;
        const halfHeight = height / 2;
        let pos = width / 2 - 2 + bitmap.width * offsetY + offsetX;
        const totalPixels = bitmap.width * bitmap.height;
        let tileIndex = 0;
        let row = 0;
        let rowWidth = 0;
        for (; row < halfHeight; row++) {
            rowWidth += 4;
            for (let i = 0; i < rowWidth; i++) {
                const pixel = tile.tileData[tileIndex];
                if (pixel !== 0 && pos >= 0 && pos < totalPixels) {
                    data[pos] = pixel;
                }
                pos++;
                tileIndex++;
            }
            pos += bitmap.width - (rowWidth + 2);
        }
        pos += 4;
        for (; row < height; row++) {
            rowWidth -= 4;
            for (let i = 0; i < rowWidth; i++) {
                const pixel = tile.tileData[tileIndex];
                if (pos >= 0 && pos < totalPixels) {
                    data[pos] = pixel;
                }
                pos++;
                tileIndex++;
            }
            pos += bitmap.width - (rowWidth - 2);
        }
    }
    draw(tile: TileData, width: number, height: number): IndexedBitmap {
        let finalWidth = width;
        let finalHeight = height;
        let offsetX = 0;
        let offsetY = 0;
        if (tile.hasExtraData) {
            offsetX += Math.max(0, tile.x - (tile.extraX ?? 0));
            offsetY += Math.max(0, tile.y - (tile.extraY ?? 0));
            finalWidth += Math.max(0, tile.x - (tile.extraX ?? 0));
            finalHeight += Math.max(0, tile.y - (tile.extraY ?? 0));
        }
        const bitmap = new IndexedBitmap(finalWidth, finalHeight);
        this.drawTileBlock(tile, bitmap, width, height, offsetX, offsetY);
        if (tile.hasExtraData) {
            this.drawExtraData(tile, bitmap);
        }
        return bitmap;
    }
    drawExtraData(tile: TileData, bitmap: IndexedBitmap): void {
        if (!tile.hasExtraData)
            return;
        const data = bitmap.data;
        const width = bitmap.width;
        const height = bitmap.height;
        const extraOffsetX = Math.max(0, (tile.extraX ?? 0) - tile.x);
        const stride = width;
        const totalPixels = width * height;
        let pos = stride * Math.max(0, (tile.extraY ?? 0) - tile.y) + extraOffsetX;
        let extraIndex = 0;
        for (let y = 0; y < (tile.extraHeight ?? 0); y++) {
            for (let x = 0; x < (tile.extraWidth ?? 0); x++) {
                const pixel = tile.extraData?.[extraIndex];
                if (pixel !== 0 && pos >= 0 && pos < totalPixels) {
                    data[pos] = pixel;
                }
                pos++;
                extraIndex++;
            }
            pos += stride - (tile.extraWidth ?? 0);
        }
    }
}
