import { Coords } from "@/game/Coords";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { TmpDrawable } from "@/engine/gfx/drawable/TmpDrawable";
import { TextureAtlas } from "@/engine/gfx/TextureAtlas";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { Anim } from "@/engine/renderable/entity/Anim";
import { LightingType } from "@/engine/type/LightingType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { BufferGeometryUtils } from "@/engine/gfx/BufferGeometryUtils";
import { PaletteBasicMaterial } from "@/engine/gfx/material/PaletteBasicMaterial";
import { getRandomInt } from "@/util/math";
import * as THREE from "three";
export class MapTileLayer {
    private theater: any;
    private art: any;
    private imageFinder: any;
    private camera: any;
    private debugFrame: any;
    private gameSpeed: any;
    private worldSound: any;
    private lighting: any;
    private useSpriteBatching: any;
    private tileIndexes: Map<any, any>;
    private tileAnimLightMultsByTile: Map<any, any>;
    private disposables: CompositeDisposable;
    private allTiles: any[];
    private target: any;
    private colorMultAttribute: any;
    private anims: any[];
    constructor(mapData: any, theater: any, art: any, imageFinder: any, camera: any, debugFrame: any, gameSpeed: any, worldSound: any, lighting: any, useSpriteBatching: any) {
        this.theater = theater;
        this.art = art;
        this.imageFinder = imageFinder;
        this.camera = camera;
        this.debugFrame = debugFrame;
        this.gameSpeed = gameSpeed;
        this.worldSound = worldSound;
        this.lighting = lighting;
        this.useSpriteBatching = useSpriteBatching;
        this.tileIndexes = new Map();
        this.tileAnimLightMultsByTile = new Map();
        this.disposables = new CompositeDisposable();
        this.allTiles = mapData.tiles.getAll();
    }
    get3DObject(): any {
        return this.target;
    }
    create3DObject(): void {
        let object3D = this.get3DObject();
        if (!object3D) {
            object3D = new (THREE as any).Object3D();
            object3D.name = "map_tile_layer";
            object3D.matrixAutoUpdate = false;
            this.target = object3D;
            this.createTileObjects(object3D);
        }
    }
    createTileObjects(parent: any): void {
        try {
            console.log('[MapTileLayer] createTileObjects start');
        }
        catch { }
        const tmpImageMap = new Map();
        const tileImageMap = new Map();
        const isoPalette = this.theater.isoPalette;
        const paletteTexture = TextureUtils.textureFromPalette(isoPalette);
        const tileSets = this.theater.tileSets;
        const validTiles: any[] = [];
        for (const tile of this.allTiles) {
            const tileNum = tile.tileNum;
            const tileData = tileSets.getTile(tileNum);
            if (!tileData) {
                try {
                    console.warn('[MapTileLayer] missing tileData for tile', tile);
                }
                catch { }
                ;
                continue;
            }
            const tmpFile = tileData.getTmpFile(tile.subTile, getRandomInt);
            if (!tmpFile || tile.subTile >= tmpFile.images.length) {
                try {
                    console.warn('[MapTileLayer] bad tmpFile or subTile', { tile, tmpFileExists: !!tmpFile });
                }
                catch { }
                ;
                continue;
            }
            const tmpImage = tmpFile.images[tile.subTile];
            tileImageMap.set(tile, tmpImage);
            validTiles.push(tile);
            if (!tmpImageMap.get(tmpImage)) {
                const drawable = new TmpDrawable().draw(tmpImage, tmpFile.blockWidth, tmpFile.blockHeight);
                tmpImageMap.set(tmpImage, drawable);
            }
        }
        const textureAtlas = new TextureAtlas();
        const drawables: any[] = [];
        tmpImageMap.forEach((drawable) => {
            drawables.push(drawable);
        });
        textureAtlas.pack(drawables);
        try {
            console.log('[MapTileLayer] textureAtlas packed', { drawables: drawables.length });
        }
        catch { }
        this.disposables.add(textureAtlas);
        const geometries: any[] = [];
        const lightingData: number[] = [];
        for (let i = 0; i < validTiles.length; i++) {
            const tile = validTiles[i];
            const tmpImage = tileImageMap.get(tile)!;
            let offsetX = 0;
            let offsetY = 0;
            if (tmpImage.hasExtraData) {
                offsetX += Math.max(0, tmpImage.x - tmpImage.extraX);
                offsetY += Math.max(0, tmpImage.y - tmpImage.extraY);
            }
            const worldPos = Coords.tile3dToWorld(tile.rx, tile.ry, tile.z);
            const drawable = tmpImageMap.get(tmpImage);
            const spriteGeometry = SpriteUtils.createSpriteGeometry({
                texture: textureAtlas.getTexture(),
                textureArea: textureAtlas.getImageRect(drawable),
                align: { x: 0, y: -1 },
                offset: { x: -offsetX, y: -offsetY },
                camera: this.camera,
                scale: Coords.ISO_WORLD_SCALE,
            });
            spriteGeometry.applyMatrix4(new (THREE as any).Matrix4().makeTranslation(worldPos.x, worldPos.y, worldPos.z));
            geometries.push(spriteGeometry);
            const { x, y, z } = this.lighting.compute(LightingType.Full, tile);
            lightingData.push(x, y, z);
            this.tileIndexes.set(tile, i);
        }
        const material = new PaletteBasicMaterial({
            map: textureAtlas.getTexture(),
            palette: paletteTexture,
            alphaTest: 0.5,
            flatShading: true,
            useVertexColorMult: true,
        });
        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
        try {
            console.log('[MapTileLayer] mergedGeometry', { geometries: geometries.length, vertexCount: mergedGeometry.getAttribute("position").count });
        }
        catch { }
        const vertexCount = mergedGeometry.getAttribute("position").count;
        const positionAttribute = mergedGeometry.getAttribute("position");
        const uvAttribute = mergedGeometry.getAttribute("uv");
        let invalidPositionValues = 0;
        for (let i = 0; i < positionAttribute.array.length; i++) {
            if (!Number.isFinite(positionAttribute.array[i])) {
                invalidPositionValues++;
            }
        }
        let invalidUvValues = 0;
        for (let i = 0; i < uvAttribute.array.length; i++) {
            if (!Number.isFinite(uvAttribute.array[i])) {
                invalidUvValues++;
            }
        }
        console.log('[MapTileLayer] geometry sanity', {
            invalidPositionValues,
            invalidUvValues,
        });
        if (vertexCount !== (SpriteUtils.VERTICES_PER_SPRITE * lightingData.length) / 3) {
            throw new Error("Vertex count mismatch");
        }
        const colorMultBuffer = new Float32Array(4 * vertexCount);
        this.updateColorMultBuffer(lightingData, colorMultBuffer);
        const colorMultAttribute = new (THREE as any).BufferAttribute(colorMultBuffer, 4);
        mergedGeometry.setAttribute("vertexColorMult", colorMultAttribute);
        this.colorMultAttribute = colorMultAttribute;
        geometries.forEach((geometry) => geometry.dispose());
        const mesh = new (THREE as any).Mesh(mergedGeometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        mesh.renderOrder = -2;
        try {
            const mapTex: any = (material as any).map;
            const palTex: any = (material as any).uniforms?.palette?.value;
            const uvAttr: any = mergedGeometry.getAttribute("uv");
            console.log('[MapTileLayer] material debug', {
                materialType: (material as any).type,
                hasMap: !!mapTex,
                mapSize: mapTex && mapTex.image ? { w: mapTex.image.width, h: mapTex.image.height } : null,
                mapFlipY: mapTex ? mapTex.flipY : undefined,
                paletteReady: !!palTex,
                paletteSize: palTex && palTex.image ? { w: palTex.image.width, h: palTex.image.height } : null,
                paletteFlipY: palTex ? palTex.flipY : undefined,
                hasUV: !!uvAttr,
                uvCount: uvAttr ? uvAttr.count : 0,
                defines: (material as any).defines,
            });
        }
        catch { }
        parent.add(mesh);
        this.disposables.add(mergedGeometry, material);
        const animations: any[] = [];
        for (const tile of validTiles) {
            const tileNum = tile.tileNum;
            const tileData = tileSets.getTile(tileNum);
            if (!tileData)
                return;
            const animData = tileData.getAnimation();
            if (animData && tile.subTile === animData.subTile) {
                const lightMult = this.lighting
                    .compute(LightingType.Full, tile)
                    .addScalar(-1);
                this.tileAnimLightMultsByTile.set(tile, lightMult);
                const anim = new Anim(animData.name, this.art.getAnimation(animData.name), {
                    x: animData.offsetX,
                    y: animData.offsetY + (Coords.ISO_TILE_SIZE + 1) / 2,
                }, this.imageFinder, this.theater, this.camera, this.debugFrame, this.gameSpeed, this.useSpriteBatching, lightMult, this.worldSound, isoPalette);
                const worldPos = Coords.tile3dToWorld(tile.rx, tile.ry, tile.z);
                anim.setPosition(worldPos);
                anim.create3DObject();
                animations.push(anim);
                parent.add(anim.get3DObject());
                this.disposables.add(anim);
            }
        }
        this.anims = animations;
    }
    update(deltaTime: number): void {
        for (const anim of this.anims) {
            anim.update(deltaTime);
        }
    }
    updateLighting(tiles?: any[]): void {
        if (tiles) {
            for (const tile of tiles) {
                const tileIndex = this.tileIndexes.get(tile);
                if (tileIndex !== undefined) {
                    const { x, y, z } = this.lighting.compute(LightingType.Full, tile);
                    this.updateColorMultBufferAtIndex(tileIndex, x, y, z, this.colorMultAttribute.array);
                }
                const animLightMult = this.tileAnimLightMultsByTile.get(tile);
                if (animLightMult) {
                    animLightMult.copy(this.lighting.compute(LightingType.Full, tile));
                }
            }
            this.colorMultAttribute.needsUpdate = true;
        }
        else {
            const lightingData: number[] = [];
            for (const tile of this.allTiles) {
                const { x, y, z } = this.lighting.compute(LightingType.Full, tile);
                lightingData.push(x, y, z);
            }
            this.updateColorMultBuffer(lightingData, this.colorMultAttribute.array);
            this.colorMultAttribute.needsUpdate = true;
            this.tileAnimLightMultsByTile.forEach((lightMult, tile) => {
                lightMult.copy(this.lighting.compute(LightingType.Full, tile));
            });
        }
    }
    private updateColorMultBuffer(lightingData: number[], buffer: Float32Array): void {
        const verticesPerSprite = SpriteUtils.VERTICES_PER_SPRITE;
        const tileCount = lightingData.length / 3;
        let bufferIndex = 0;
        for (let i = 0; i < tileCount; i++) {
            const r = lightingData[3 * i];
            const g = lightingData[3 * i + 1];
            const b = lightingData[3 * i + 2];
            for (let j = 0; j < verticesPerSprite; j++) {
                buffer[bufferIndex++] = r;
                buffer[bufferIndex++] = g;
                buffer[bufferIndex++] = b;
                buffer[bufferIndex++] = 1;
            }
        }
    }
    private updateColorMultBufferAtIndex(tileIndex: number, r: number, g: number, b: number, buffer: Float32Array): void {
        const verticesPerSprite = SpriteUtils.VERTICES_PER_SPRITE;
        let bufferIndex = tileIndex * verticesPerSprite * 4;
        for (let i = 0; i < verticesPerSprite; i++) {
            buffer[bufferIndex++] = r;
            buffer[bufferIndex++] = g;
            buffer[bufferIndex++] = b;
            buffer[bufferIndex++] = 1;
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
