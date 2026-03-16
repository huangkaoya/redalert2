import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { UiObject } from "@/gui/UiObject";
import { LobbyType } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { Coords } from "@/game/Coords";
import { IsoCoords } from "@/engine/IsoCoords";
import { THREE } from "@/setupThreeGlobal";
interface MapFile {
    decodePreviewImage(): {
        data: Uint8Array;
        width: number;
        height: number;
    };
    fullSize: {
        width: number;
        height: number;
    };
    localSize: {
        width: number;
        height: number;
        x: number;
        y: number;
    };
    startingLocations: {
        x: number;
        y: number;
    }[];
}
interface Size {
    width: number;
    height: number;
}
const tooltipMap = new Map<LobbyType, string>([
    [LobbyType.Singleplayer, "STT:SkirmishMapThumbnail"],
    [LobbyType.MultiplayerHost, "STT:HostMapThumbnail"],
    [LobbyType.MultiplayerGuest, "STT:GuestMapThumbnail"],
]);
export class MapPreviewRenderer {
    private strings: any;
    constructor(strings: any) {
        this.strings = strings;
    }
    render(mapFile: MapFile, lobbyType: LobbyType, containerSize: Size): UiObject | undefined {
        let previewImage;
        try {
            previewImage = mapFile.decodePreviewImage();
        }
        catch (error) {
            console.error("Failed to decode map preview data", error);
        }
        if (previewImage) {
            const { data, width, height } = previewImage;
            let canvas = CanvasUtils.canvasFromRgbImageData(data, width, height);
            let scale = 1;
            const scaleFactor = canvas.width < containerSize.width / 2 || canvas.height < containerSize.height / 2 ? 4 : 2;
            const scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = scaleFactor * canvas.width;
            scaledCanvas.height = scaleFactor * canvas.height;
            const ctx = scaledCanvas.getContext("2d");
            if (ctx) {
                scale = scaleFactor;
                ctx.scale(scale, scale);
                ctx.drawImage(canvas, 0, 0);
                canvas = scaledCanvas;
            }
            this.drawStartLocations(canvas, mapFile, containerSize, scale);
            const container = new HtmlContainer();
            const uiObject = new UiObject(new THREE.Object3D(), container);
            container.setSize("100%", "100%");
            container.render();
            canvas.style.objectFit = "contain";
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.setAttribute("data-r-tooltip", this.strings.get(tooltipMap.get(lobbyType)));
            container.getElement().appendChild(canvas);
            return uiObject;
        }
        return undefined;
    }
    private drawStartLocations(canvas: HTMLCanvasElement, mapFile: MapFile, containerSize: Size, scale: number): void {
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        IsoCoords.init({
            x: 0,
            y: (mapFile.fullSize.width * Coords.getWorldTileSize()) / 2,
        });
        const worldOrigin = IsoCoords.worldToScreen(0, 0);
        const screenTileOrigin = IsoCoords.screenToScreenTile(worldOrigin.x, worldOrigin.y);
        const canvasScale = canvas.width > canvas.height
            ? canvas.width / containerSize.width / scale
            : canvas.height / containerSize.height / scale;
        const fontSize = 13 * canvasScale;
        const outlineWidth = 2 * canvasScale;
        for (const [index, location] of mapFile.startingLocations.entries()) {
            const screenPos = IsoCoords.tileToScreen(location.x, location.y);
            const screenTilePos = IsoCoords.screenToScreenTile(screenPos.x, screenPos.y);
            screenTilePos.x += screenTileOrigin.x;
            screenTilePos.y += screenTileOrigin.y;
            const canvasPos = this.dxyToCanvas(screenTilePos.x, screenTilePos.y, canvas, mapFile.localSize);
            canvasPos.x /= scale;
            canvasPos.y /= scale;
            CanvasUtils.drawText(ctx, String(index + 1), canvasPos.x - fontSize / 4, canvasPos.y - fontSize / 2, {
                fontSize: fontSize,
                color: "yellow",
                outlineColor: "black",
                outlineWidth: outlineWidth,
            });
        }
    }
    private dxyToCanvas(x: number, y: number, canvas: HTMLCanvasElement, localSize: {
        width: number;
        height: number;
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    } {
        const scaleX = canvas.width / (2 * localSize.width);
        const scaleY = canvas.height / localSize.height / 2;
        return {
            x: (x - 2 * localSize.x) * scaleX,
            y: (y - 2 * localSize.y) * scaleY,
        };
    }
}
