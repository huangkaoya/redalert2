import { RgbaBitmap } from '../../../data/Bitmap';
import { Palette } from '../../../data/Palette';
export class PalDrawable {
    private pal: Palette;
    constructor(palette: Palette) {
        this.pal = palette;
    }
    draw(): RgbaBitmap {
        const size = this.pal.size;
        const bitmap = new RgbaBitmap(size, 1);
        let dataIndex = 0;
        for (let i = 0; i < size; i++) {
            const color = this.pal.getColor(i);
            bitmap.data[dataIndex] = color.r;
            bitmap.data[dataIndex + 1] = color.g;
            bitmap.data[dataIndex + 2] = color.b;
            bitmap.data[dataIndex + 3] = i ? 255 : 0;
            dataIndex += 4;
        }
        return bitmap;
    }
}
