import { Renderer } from "@/engine/gfx/Renderer";
import { UiAnimationLoop } from "@/engine/UiAnimationLoop";
import { WorldScene } from "@/engine/renderable/WorldScene";
import { BoxedVar } from "@/util/BoxedVar";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
import { CanvasMetrics } from "@/gui/CanvasMetrics";
import { PointerEvents } from "@/gui/PointerEvents";
import { CameraZoomControls } from "@/tools/CameraZoomControls";
import { Engine } from "@/engine/Engine";
import { Rules } from "@/game/rules/Rules";
import { Art } from "@/game/art/Art";
import { TheaterType } from "@/engine/TheaterType";
import { GameMap } from "@/game/GameMap";
import { getRandomInt } from "@/util/math";
import { ImageFinder } from "@/engine/ImageFinder";
import { MapRenderable } from "@/engine/renderable/entity/map/MapRenderable";
import { Lighting } from "@/engine/Lighting";
import { LightingDirector } from "@/engine/gfx/lighting/LightingDirector";
import { IsoCoords } from "@/engine/IsoCoords";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
declare const THREE: any;
export class WorldSceneTester {
    private static disposables = new CompositeDisposable();
    private static renderer?: Renderer;
    private static worldScene?: WorldScene;
    private static uiAnimationLoop?: UiAnimationLoop;
    static async main(mixFileLoader: any, gameMapFile: any, parentElement: HTMLElement, _strings: any): Promise<void> {
        this.buildHomeButton();
        const renderer = (this.renderer = new Renderer(800, 600));
        renderer.init(parentElement);
        renderer.initStats(document.body);
        this.disposables.add(renderer);
        const worldScene = (this.worldScene = WorldScene.factory({ x: 0, y: 0, width: 800, height: 600 }, new BoxedVar(true), new BoxedVar(ShadowQuality.High)));
        this.disposables.add(worldScene);
        IsoCoords.init({ x: 0, y: 0 });
        worldScene.create3DObject();
        await mixFileLoader.addMixFile("sidec01.mix");
        const rules = new Rules(Engine.getRules());
        const art = new Art(rules, Engine.getArt(), undefined, undefined);
        const theater = await Engine.loadTheater(TheaterType.Temperate);
        const gameMap = new GameMap(gameMapFile, theater.tileSets, rules, (min: number, max: number) => getRandomInt(min, max));
        const lighting = new Lighting();
        this.disposables.add(lighting);
        worldScene.applyLighting(lighting);
        const lightingDirector = new LightingDirector(lighting.mapLighting as any, renderer, new BoxedVar(1));
        lightingDirector.init();
        this.disposables.add(lightingDirector);
        const imageFinder = new ImageFinder(Engine.getImages() as any, theater);
        const mapRenderable = new MapRenderable(gameMap, undefined, { onChange: { subscribe() { }, unsubscribe() { } }, getRadLevel() { return 0; } }, lighting, theater, rules, art, imageFinder, worldScene.camera, new BoxedVar(false), 1, undefined as any, true);
        (worldScene as any).add(mapRenderable as any);
        worldScene.processRenderQueue();
        try {
            const localSize = (gameMap as any).mapBounds.getLocalSize();
            const computeMapScreenBounds = (ls: {
                x: number;
                y: number;
                width: number;
                height: number;
            }) => {
                const topLeft = IsoCoords.screenTileToScreen(ls.x, ls.y);
                const bottomRight = IsoCoords.screenTileToScreen(ls.x + ls.width, ls.y + ls.height - 1);
                return { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
            };
            const mapScreenBounds = computeMapScreenBounds(localSize);
            const { MapPanningHelper } = await import("@/engine/util/MapPanningHelper");
            const panningHelper = new (MapPanningHelper as any)(gameMap);
            worldScene.cameraPan.setPanLimits((panningHelper as any).computeCameraPanLimits(worldScene.viewport, mapScreenBounds));
            const start = (gameMap as any).startingLocations?.[0] ?? { x: Math.floor(localSize.x + localSize.width / 2), y: Math.floor(localSize.y + localSize.height / 2) };
            const initialPan = (panningHelper as any).computeCameraPanFromTile(start.x, start.y);
            worldScene.cameraPan.setPan(initialPan);
            const centerWorld = IsoCoords.screenTileToWorld(localSize.x + localSize.width / 2, localSize.y + localSize.height / 2);
            worldScene.setLightFocusPoint(centerWorld.x, centerWorld.y);
        }
        catch (e) {
            console.warn('[WorldSceneTester] Failed to set initial camera/light focus:', e);
        }
        (worldScene.scene as any).background = new (THREE as any).Color(0xE0E0E0);
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(canvasMetrics);
        const pointerEvents = new PointerEvents(renderer, { x: 0, y: 0 }, document, canvasMetrics);
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        this.disposables.add(cameraZoomControls, pointerEvents);
        cameraZoomControls.init();
        renderer.addScene(worldScene);
        const loop = (this.uiAnimationLoop = new UiAnimationLoop(renderer));
        loop.start();
    }
    private static buildHomeButton(): void {
        const homeButton = document.createElement('button');
        homeButton.innerHTML = '点此返回主页';
        homeButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: 10px;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
        homeButton.onmouseover = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            homeButton.style.transform = 'translateX(-50%) translateY(-2px)';
            homeButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        };
        homeButton.onmouseout = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            homeButton.style.transform = 'translateX(-50%) translateY(0)';
            homeButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        };
        homeButton.onclick = () => {
            window.location.hash = '/';
        };
        document.body.appendChild(homeButton);
        this.disposables.add(() => homeButton.remove());
    }
    static destroy(): void {
        if (this.uiAnimationLoop) {
            this.uiAnimationLoop.destroy();
            this.uiAnimationLoop = undefined;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = undefined;
        }
        this.disposables.dispose();
    }
}
