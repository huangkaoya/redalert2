import type { ShpFile } from '../../data/ShpFile';
import type { Palette } from '../../data/Palette';
import { IndexedBitmap } from '../../data/Bitmap';
import { CanvasUtils } from './CanvasUtils';
export class ImageUtils {
    static async convertShpToPng(shpFile: ShpFile, palette: Palette): Promise<Blob> {
        const canvas = this.convertShpToCanvas(shpFile, palette);
        return await CanvasUtils.canvasToBlob(canvas);
    }
    static convertShpToBitmap(shpFile: ShpFile, palette: Palette, forceSquare: boolean = false): IndexedBitmap {
        let offsetX = 0;
        let offsetY = 0;
        let finalWidth = shpFile.width;
        let finalHeight = shpFile.height;
        if (finalWidth !== finalHeight && forceSquare) {
            offsetX = finalWidth > finalHeight ? 0 : Math.floor((finalHeight - finalWidth) / 2);
            offsetY = finalWidth > finalHeight ? Math.floor((finalWidth - finalHeight) / 2) : 0;
            finalWidth = finalHeight = Math.max(finalWidth, finalHeight);
        }
        const bitmap = new IndexedBitmap(shpFile.numImages * finalWidth, finalHeight);
        for (let i = 0; i < shpFile.numImages; i++) {
            const image = shpFile.getImage(i);
            const imageBitmap = new IndexedBitmap(image.width, image.height, image.imageData);
            bitmap.drawIndexedImage(imageBitmap, i * finalWidth + image.x + offsetX, image.y + offsetY);
        }
        return bitmap;
    }
    static convertShpToCanvas(shpFile: ShpFile, palette: Palette, forceSquare: boolean = false): HTMLCanvasElement {
        const bitmap = this.convertShpToBitmap(shpFile, palette, forceSquare);
        return CanvasUtils.canvasFromIndexedImageData(bitmap.data, bitmap.width, bitmap.height, palette);
    }
}
