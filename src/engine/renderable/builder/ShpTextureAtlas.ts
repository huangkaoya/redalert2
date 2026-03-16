import { IndexedBitmap } from "../../../data/Bitmap";
import { TextureAtlas } from "../../gfx/TextureAtlas";
export class ShpTextureAtlas {
    private images: IndexedBitmap[];
    private atlas: TextureAtlas;
    fromShpFile(shpFile: any): ShpTextureAtlas {
        const bitmaps: IndexedBitmap[] = [];
        for (let i = 0; i < shpFile.numImages; i++) {
            const image = shpFile.getImage(i);
            bitmaps.push(new IndexedBitmap(image.width, image.height, image.imageData));
        }
        const atlas = new TextureAtlas();
        atlas.pack(bitmaps);
        this.images = bitmaps;
        this.atlas = atlas;
        return this;
    }
    getTextureArea(imageIndex: number): any {
        return this.atlas.getImageRect(this.images[imageIndex]);
    }
    getTexture(): any {
        return this.atlas.getTexture();
    }
    dispose(): void {
        this.atlas.dispose();
    }
}
