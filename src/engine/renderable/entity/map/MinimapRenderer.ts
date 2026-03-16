import * as Coords from "@/game/Coords";
interface DxySize {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface CanvasSize {
    width: number;
    height: number;
}
interface Point {
    x: number;
    y: number;
}
export class MinimapRenderer {
    private map: any;
    private minimapModel: any;
    private borderColor: string;
    private canvasRenderScale: number;
    private dxySize: DxySize;
    private canvasSize: CanvasSize;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    constructor(map: any, minimapModel: any, size: CanvasSize, borderColor: string, canvasRenderScale: number) {
        this.map = map;
        this.minimapModel = minimapModel;
        this.borderColor = borderColor;
        this.canvasRenderScale = canvasRenderScale;
        const rawSize = this.map.mapBounds.getRawLocalSize();
        this.dxySize = {
            x: 2 * rawSize.x,
            y: 2 * rawSize.y + 4,
            width: 2 * rawSize.width,
            height: 2 * rawSize.height + 8,
        };
        const aspectRatio = this.dxySize.height / this.dxySize.width;
        this.canvasSize = this.computeCanvasSize(size, aspectRatio);
    }
    private computeCanvasSize(size: CanvasSize, aspectRatio: number): CanvasSize {
        const { width, height } = size;
        let result: CanvasSize;
        if (height / width <= aspectRatio) {
            result = {
                width: Math.floor(height / aspectRatio),
                height: height
            };
        }
        else {
            result = {
                width: width,
                height: Math.floor(width * aspectRatio)
            };
        }
        return result;
    }
    public renderFull(): HTMLCanvasElement {
        if (this.canvas) {
            this.ctx!.fillStyle = "black";
            this.ctx!.fillRect(0, 0, this.canvasRenderScale * this.canvasSize.width, this.canvasRenderScale * this.canvasSize.height);
        }
        else {
            this.canvas = document.createElement("canvas");
            this.canvas.width = this.canvasRenderScale * this.canvasSize.width;
            this.canvas.height = this.canvasRenderScale * this.canvasSize.height;
            const ctx = this.canvas.getContext("2d", { alpha: false });
            if (!ctx)
                throw new Error("Failed to get 2D context");
            this.ctx = ctx;
            this.ctx.translate(0.5, 0.5);
        }
        this.renderTiles(this.map.tiles.getAll(), true);
        return this.canvas;
    }
    public renderIncremental(tiles: any[]): void {
        const tileSet = new Set(tiles);
        for (const tile of tiles) {
            const neighbors = this.map.tiles.getAllNeighbourTiles(tile);
            neighbors.forEach(neighbor => tileSet.add(neighbor));
        }
        this.renderTiles(tileSet);
    }
    private renderTiles(tiles: Set<any> | any[], isFullRender: boolean = false): void {
        const scale = this.canvasSize.width / this.dxySize.width / Coords.Coords.COS_ISO_CAMERA_BETA;
        const ctx = this.ctx;
        if (!ctx) {
            throw new Error("Must do a full render before re-rendering any individual tiles.");
        }
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.rotate(Coords.Coords.ISO_CAMERA_BETA);
        ctx.scale(scale, scale);
        for (const tile of tiles) {
            const color = this.minimapModel.getTileColor(tile);
            if (!color || (isFullRender && color === "#000000"))
                continue;
            ctx.fillStyle = color;
            const { x, y } = this.tileToLocalRxyOrigin(tile);
            ctx.fillRect(this.canvasRenderScale * x, this.canvasRenderScale * y, this.canvasRenderScale + 0.5, this.canvasRenderScale + 0.5);
        }
        ctx.restore();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.canvasRenderScale;
        ctx.strokeRect(0, 0, ctx.canvas.width - this.canvasRenderScale, ctx.canvas.height - this.canvasRenderScale);
    }
    private tileToLocalRxyOrigin(tile: any): Point {
        const origin = this.dxyToLocalRxy(this.dxySize.x, this.dxySize.y);
        return {
            x: tile.rx - origin.x,
            y: tile.ry - this.map.mapBounds.getFullSize().width / 2 - origin.y
        };
    }
    private dxyToLocalRxy(x: number, y: number): Point {
        return {
            x: (x + y) / 2,
            y: (y - x) / 2
        };
    }
    public dxyToCanvas(x: number, y: number): Point {
        const scale = this.canvasSize.width / this.dxySize.width;
        return {
            x: (x - this.dxySize.x) * scale,
            y: (y - this.dxySize.y) * scale
        };
    }
    public canvasToDxy(x: number, y: number): Point {
        const scale = this.canvasSize.width / this.dxySize.width;
        return {
            x: x / scale + this.dxySize.x,
            y: y / scale + this.dxySize.y
        };
    }
}
