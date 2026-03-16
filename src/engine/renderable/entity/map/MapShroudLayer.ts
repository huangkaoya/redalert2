import { Coords } from "@/game/Coords";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { ShpTextureAtlas } from "@/engine/renderable/builder/ShpTextureAtlas";
import { Palette } from "@/data/Palette";
import { Color } from "@/util/Color";
import { MapShroud, ShroudType } from "@/game/map/MapShroud";
import { BufferGeometryUtils } from "@/engine/gfx/BufferGeometryUtils";
import { PaletteBasicMaterial } from "@/engine/gfx/material/PaletteBasicMaterial";
import { Engine } from "@/engine/Engine";
import * as THREE from "three";
const edgeFrameMap = [
    [1, 32],
    [4, 33],
    [8, 34],
    [2, 35],
    [5, 36],
    [12, 37],
    [10, 38],
    [3, 39],
    [13, 40],
    [14, 41],
    [11, 42],
    [7, 43],
    [9, 44],
    [6, 45],
    [15, 46],
].reduce((map, [key, value]) => ((map[key] = value), map), new Array(16).fill(undefined));
const cornerFrameMap = [
    [24, 16],
    [34, 17],
    [50, 18],
    [65, 19],
    [97, 20],
    [132, 21],
    [152, 22],
    [196, 23],
    [18, 24],
    [33, 25],
    [68, 26],
    [136, 27],
    [26, 28],
    [35, 29],
    [69, 30],
    [140, 31],
].reduce((map, [key, value]) => ((map[key] = value), map), new Array(256).fill(undefined));
const edgeMaskTable = [0, 5, 12, 13, 10, 15, 14, 15, 3, 7, 15, 15, 11, 15, 15, 15];
export class MapShroudLayer {
    private shroud: any;
    private imageFinder: any;
    private camera: any;
    private disposables: CompositeDisposable;
    private needsIncrementalUpdate: any[] = [];
    private needsFullUpdate: boolean | string = false;
    private target: any;
    private uvAttribute: any;
    private uvElemsPerPiece: number;
    private uvLookup: Float32Array;
    constructor(shroud: any, imageFinder: any, camera: any) {
        this.shroud = shroud;
        this.imageFinder = imageFinder;
        this.camera = camera;
        this.disposables = new CompositeDisposable();
        this.needsIncrementalUpdate = [];
        this.needsFullUpdate = false;
        this.onShroudChange = (event: any) => {
            if (event.type === "incremental") {
                this.needsIncrementalUpdate.push(...event.coords);
            }
            else {
                this.needsFullUpdate = event.type;
            }
        };
        this.camera = camera;
    }
    private onShroudChange: (event: any) => void;
    get3DObject() {
        return this.target;
    }
    create3DObject() {
        let object3D = this.get3DObject();
        if (!object3D) {
            object3D = new (THREE as any).Object3D();
            object3D.name = "map_shroud_layer";
            object3D.matrixAutoUpdate = false;
            this.target = object3D;
            this.createTileObjects(object3D);
            this.shroud.onChange.subscribe(this.onShroudChange);
            this.disposables.add(() => this.shroud.onChange.unsubscribe(this.onShroudChange));
        }
    }
    setShroud(shroud: any) {
        this.shroud.onChange.unsubscribe(this.onShroudChange);
        this.shroud = shroud;
        this.shroud.onChange.subscribe(this.onShroudChange);
        this.needsFullUpdate = "full";
    }
    createTileObjects(parent: any) {
        const shroudFile = this.imageFinder.find(Engine.shroudFileName.split(".")[0], false);
        let textureAtlas = new ShpTextureAtlas().fromShpFile(shroudFile);
        this.disposables.add(textureAtlas);
        let palette = new Palette();
        let colors = [new Color(0, 0, 0), new Color(0, 0, 0)];
        for (let i = 0; i < 254; i++) {
            const alpha = Math.min(255, Math.floor((i / 125) * 255));
            colors.push(new Color(alpha, alpha, alpha));
        }
        palette.setColors(colors);
        const paletteTexture = TextureUtils.textureFromPalette(palette);
        let geometries = [];
        let tileCount = 0;
        const mapSize = this.shroud.getSize();
        for (let y = 0; y < mapSize.height; y++) {
            for (let x = 0; x < mapSize.width; x++) {
                const shroudCoords = { sx: x, sy: y };
                const frameNo = this.getFrameNo(shroudCoords);
                const tileGeometry = this.createTileGeometry(shroudCoords, textureAtlas, frameNo);
                geometries.push(tileGeometry);
                tileCount++;
            }
        }
        const material = new PaletteBasicMaterial({
            map: textureAtlas.getTexture(),
            palette: paletteTexture,
            alphaTest: 0.01,
            flatShading: true,
            transparent: true,
            depthTest: false,
            blending: (THREE as any).MultiplyBlending,
        });
        let mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
        if (mergedGeometry.getAttribute("position").count !==
            SpriteUtils.VERTICES_PER_SPRITE * tileCount) {
            throw new Error("Vertex count mismatch");
        }
        this.uvAttribute = mergedGeometry.getAttribute("uv");
        this.uvElemsPerPiece =
            (this.uvAttribute.count * this.uvAttribute.itemSize) / tileCount;
        this.uvLookup = new Float32Array(47 * this.uvElemsPerPiece);
        for (let frameIndex = 0; frameIndex < 47; frameIndex++) {
            let spriteGeometry = SpriteUtils.createSpriteGeometry(this.getTileGeometryOptions(textureAtlas, frameIndex));
            this.uvLookup.set(spriteGeometry.getAttribute("uv").array, frameIndex * this.uvElemsPerPiece);
        }
        geometries.forEach((geometry) => geometry.dispose());
        let mesh = new (THREE as any).Mesh(mergedGeometry, material);
        mesh.renderOrder = 999999;
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        parent.add(mesh);
        this.disposables.add(mergedGeometry, material);
    }
    createTileGeometry(shroudCoords: any, textureAtlas: any, frameNo: number) {
        const { rx, ry } = this.shroud.shroudCoordsToWorld(shroudCoords);
        const worldPos = Coords.tile3dToWorld(rx, ry, 0);
        let spriteGeometry = SpriteUtils.createSpriteGeometry(this.getTileGeometryOptions(textureAtlas, frameNo));
        spriteGeometry.applyMatrix4(new (THREE as any).Matrix4().makeTranslation(worldPos.x, worldPos.y, worldPos.z));
        return spriteGeometry;
    }
    getTileGeometryOptions(textureAtlas: any, frameNo: number) {
        return {
            texture: textureAtlas.getTexture(),
            textureArea: textureAtlas.getTextureArea(frameNo),
            flat: true,
            align: { x: 0, y: -1 },
            camera: this.camera,
            scale: Coords.ISO_WORLD_SCALE,
        };
    }
    update(deltaTime: number) {
        if (this.needsFullUpdate) {
            if (this.needsFullUpdate === "cover" || this.needsFullUpdate === "clear") {
                this.toggleAllTiles(this.needsFullUpdate === "cover"
                    ? ShroudType.Unexplored
                    : ShroudType.Explored);
            }
            else {
                this.updateAllTiles();
                this.needsIncrementalUpdate = [];
            }
            this.uvAttribute.needsUpdate = true;
            this.needsFullUpdate = false;
        }
        if (this.needsIncrementalUpdate.length) {
            const tilesToUpdate = this.extendToAdjacentTiles(this.needsIncrementalUpdate);
            this.updateTiles(tilesToUpdate);
            this.uvAttribute.needsUpdate = true;
            this.needsIncrementalUpdate.length = 0;
        }
    }
    extendToAdjacentTiles(coords: any[]) {
        let tileMap = new Map();
        const mapSize = this.shroud.getSize();
        for (const coord of coords) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = coord.sx + dx;
                    const y = coord.sy + dy;
                    if (x >= 0 && y >= 0 && x < mapSize.width && y < mapSize.height) {
                        tileMap.set(x + "_" + y, { sx: x, sy: y });
                    }
                }
            }
        }
        return [...tileMap.values()];
    }
    updateTiles(coords: any[]) {
        const mapSize = this.shroud.getSize();
        for (const coord of coords) {
            const tileIndex = coord.sx + coord.sy * mapSize.width;
            this.updateTilePiece(tileIndex, this.getFrameNo(coord));
        }
    }
    updateAllTiles() {
        const mapSize = this.shroud.getSize();
        for (let y = 0; y < mapSize.height; y++) {
            for (let x = 0; x < mapSize.width; x++) {
                const shroudCoords = { sx: x, sy: y };
                const tileIndex = shroudCoords.sx + shroudCoords.sy * mapSize.width;
                this.updateTilePiece(tileIndex, this.getFrameNo(shroudCoords));
            }
        }
    }
    toggleAllTiles(shroudType: any) {
        const frameNo = shroudType === ShroudType.Unexplored ? 15 : 0;
        const uvData = this.uvLookup.subarray(frameNo * this.uvElemsPerPiece, (1 + frameNo) * this.uvElemsPerPiece);
        let uvArray = this.uvAttribute.array;
        const mapSize = this.shroud.getSize();
        for (let i = 0, total = mapSize.width * mapSize.height; i < total; i++) {
            uvArray.set(uvData, i * this.uvElemsPerPiece);
        }
    }
    updateTilePiece(tileIndex: number, frameNo: number) {
        this.uvAttribute.array.set(this.uvLookup.subarray(frameNo * this.uvElemsPerPiece, (frameNo + 1) * this.uvElemsPerPiece), tileIndex * this.uvElemsPerPiece);
    }
    getFrameNo(shroudCoords: any): number {
        if (this.shroud.getShroudTypeByShroudCoords(shroudCoords) ===
            ShroudType.Unexplored) {
            return 15;
        }
        let edgeValue = 0;
        if (this.hasShroudedNeighbour(shroudCoords, 0, -1))
            edgeValue += 1;
        if (this.hasShroudedNeighbour(shroudCoords, 1, 0))
            edgeValue += 2;
        if (this.hasShroudedNeighbour(shroudCoords, 0, 1))
            edgeValue += 4;
        if (this.hasShroudedNeighbour(shroudCoords, -1, 0))
            edgeValue += 8;
        let cornerValue = 0;
        for (let dx = -1; dx <= 1; dx += 2) {
            for (let dy = -1; dy <= 1; dy += 2) {
                if (this.hasShroudedNeighbour(shroudCoords, dx, dy)) {
                    const bitIndex = dx + 1 + ((dy + 1) >> 1);
                    cornerValue += 1 << bitIndex;
                }
            }
        }
        if (cornerValue > 0) {
            if (edgeValue === 0) {
                edgeValue = edgeFrameMap[cornerValue];
            }
            else {
                const maskedCornerValue = cornerValue & ~edgeMaskTable[edgeValue];
                if (maskedCornerValue > 0) {
                    const mappedFrame = cornerFrameMap[maskedCornerValue + (edgeValue << 4)];
                    if (mappedFrame === undefined) {
                        throw new Error(`Missing mapped corner frame number for cornerValue "${cornerValue}",` +
                            "edgeFrameNo=" +
                            edgeValue);
                    }
                    edgeValue = mappedFrame;
                }
            }
        }
        return edgeValue;
    }
    hasShroudedNeighbour({ sx, sy }: any, dx: number, dy: number): boolean {
        return (this.shroud.getShroudTypeByShroudCoords({
            sx: sx + dx,
            sy: sy + dy,
        }) === ShroudType.Unexplored);
    }
    dispose() {
        this.disposables.dispose();
    }
}
