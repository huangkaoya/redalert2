import * as THREE from 'three';
import { UiObject } from './UiObject';
import { HtmlContainer } from './HtmlContainer';
import { ShpFile } from '../data/ShpFile';
import { BatchShpBuilder } from '../engine/renderable/builder/BatchShpBuilder';
interface SpriteProps {
    image: string | ShpFile;
    frame?: number;
    palette: string | any;
    x?: number;
    y?: number;
    zIndex?: number;
}
interface AggregatedShpFile {
    file: ShpFile;
    imageIndexes: Map<any, number>;
}
export class ShpSpriteBatch extends UiObject {
    private spriteProps: SpriteProps[];
    private getShpFile: (filename: string) => ShpFile;
    private getPalette: (paletteName: string) => any;
    private camera: THREE.Camera;
    private textureCache: Map<any, any>;
    private batchShpBuilders: BatchShpBuilder[];
    constructor(spriteProps: SpriteProps[], getShpFile: (filename: string) => ShpFile, getPalette: (paletteName: string) => any, camera: THREE.Camera) {
        super(new THREE.Object3D(), new HtmlContainer());
        this.spriteProps = spriteProps;
        this.getShpFile = getShpFile;
        this.getPalette = getPalette;
        this.camera = camera;
        this.textureCache = new Map();
        this.batchShpBuilders = [];
    }
    create3DObject(): void {
        super.create3DObject();
        const aggregatedFile = this.createAggregatedShpFile();
        this.createObjects(this.get3DObject(), aggregatedFile);
    }
    private createAggregatedShpFile(): AggregatedShpFile {
        let aggregatedShpFile = new ShpFile();
        aggregatedShpFile.filename = "agg_unnamed_spritebatch.shp";
        let imageIndexes = new Map();
        let currentIndex = 0;
        for (const spriteProps of this.spriteProps) {
            let shpFile = typeof spriteProps.image === "string"
                ? this.getShpFile(spriteProps.image)
                : spriteProps.image;
            const image = shpFile.getImage(spriteProps.frame ?? 0);
            if (!imageIndexes.has(image)) {
                aggregatedShpFile.addImage(image);
                imageIndexes.set(image, currentIndex);
                currentIndex++;
            }
        }
        return { file: aggregatedShpFile, imageIndexes: imageIndexes };
    }
    private createObjects(object3D: THREE.Object3D, aggregatedFile: AggregatedShpFile): void {
        let paletteGroups = new Map<string, SpriteProps[]>();
        for (const spriteProps of this.spriteProps) {
            const palette = typeof spriteProps.palette === "string"
                ? this.getPalette(spriteProps.palette)
                : spriteProps.palette;
            const paletteHash = palette.hash;
            const group = paletteGroups.get(paletteHash) ?? [];
            group.push(spriteProps);
            paletteGroups.set(paletteHash, group);
        }
        for (const spriteGroup of paletteGroups.values()) {
            const palette = typeof spriteGroup[0].palette === "string"
                ? this.getPalette(spriteGroup[0].palette)
                : spriteGroup[0].palette;
            let batchItems: any[] = [];
            for (const spriteProps of spriteGroup) {
                let shpFile = typeof spriteProps.image === "string"
                    ? this.getShpFile(spriteProps.image)
                    : spriteProps.image;
                const image = shpFile.getImage(spriteProps.frame ?? 0);
                const frameIndex = aggregatedFile.imageIndexes.get(image);
                if (frameIndex === undefined) {
                    throw new Error("Missing frame in aggregated sprite shp file");
                }
                const batchItem = {
                    position: new THREE.Vector3(spriteProps.x ?? 0, spriteProps.y ?? 0, UiObject.zIndexToWorld(spriteProps.zIndex ?? 0)),
                    shpFile: shpFile,
                    depth: false,
                    flat: false,
                    frameNo: frameIndex,
                    offset: { x: shpFile.width / 2, y: shpFile.height / 2 },
                };
                batchItems.push(batchItem);
            }
            if (batchItems.length > 0) {
                let batchBuilder = new BatchShpBuilder(aggregatedFile.file, palette, this.camera, this.textureCache, undefined, undefined, batchItems.length);
                batchItems.forEach((item) => batchBuilder.add(item));
                this.batchShpBuilders.push(batchBuilder);
                object3D.add(batchBuilder.build());
            }
        }
    }
    destroy(): void {
        super.destroy();
        this.batchShpBuilders.forEach((builder) => builder.dispose());
        [...this.textureCache.values()].forEach((texture) => texture.dispose());
        this.textureCache.clear();
    }
}
