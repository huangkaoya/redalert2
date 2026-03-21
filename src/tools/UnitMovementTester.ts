import { Renderer } from "@/engine/gfx/Renderer";
import { UiAnimationLoop } from "@/engine/UiAnimationLoop";
import { WorldScene } from "@/engine/renderable/WorldScene";
import { BoxedVar } from "@/util/BoxedVar";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
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
import { CanvasMetrics } from "@/gui/CanvasMetrics";
import { CameraZoomControls } from "@/tools/CameraZoomControls";
import { PointerEvents } from "@/gui/PointerEvents";
import { Pointer } from "@/gui/Pointer";
import { PointerType } from "@/engine/type/PointerType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { MapTileIntersectHelper } from "@/engine/util/MapTileIntersectHelper";
import { RaycastHelper } from "@/engine/util/RaycastHelper";
import { WorldViewportHelper } from "@/engine/util/WorldViewportHelper";
import { EntityIntersectHelper } from "@/engine/util/EntityIntersectHelper";
import { World } from "@/game/World";
import { Player } from "@/game/Player";
import { PlayerList } from "@/game/PlayerList";
import { Alliances } from "@/game/Alliances";
import { UnitSelection } from "@/game/gameobject/selection/UnitSelection";
import { RenderableFactory } from "@/engine/renderable/entity/RenderableFactory";
import { RenderableManager } from "@/engine/RenderableManager";
import { Strings } from "@/data/Strings";
import { VxlBuilderFactory } from "@/engine/renderable/builder/VxlBuilderFactory";
import { VxlGeometryPool } from "@/engine/renderable/builder/vxlGeometry/VxlGeometryPool";
import { VxlGeometryCache } from "@/engine/gfx/geometry/VxlGeometryCache";
import { FlyerHelperMode } from "@/engine/renderable/entity/unit/FlyerHelperMode";
import { ObjectFactory } from "@/game/gameobject/ObjectFactory";
import { ObjectType } from "@/engine/type/ObjectType";
import { SelectionLevel } from "@/game/gameobject/selection/SelectionLevel";
import { Game } from "@/game/Game";
import { OrderType } from "@/game/order/OrderType";
import { MoveOrder } from "@/game/order/MoveOrder";
import { MapPanningHelper } from "@/engine/util/MapPanningHelper";
import { ResourceType } from "@/engine/resourceConfigs";
import { SellTrait } from "@/game/trait/SellTrait";
import { TestToolSupport, type TestToolRuntimeContext } from "@/tools/TestToolSupport";
declare const THREE: any;
export class UnitMovementTester {
    private static disposables = new CompositeDisposable();
    private static renderer?: Renderer;
    private static uiAnimationLoop?: UiAnimationLoop;
    private static worldScene?: WorldScene;
    private static renderableManager?: RenderableManager;
    private static game?: Game;
    private static gameTickTimer?: number;
    private static currentUnit?: any;
    private static currentVehicle?: any;
    private static currentAircraft?: any;
    private static unitSwitchEl?: HTMLDivElement;
    private static selectBoxEl?: HTMLDivElement;
    private static dragStart?: {
        x: number;
        y: number;
    };
    private static isDragging: boolean = false;
    private static dragThreshold = 7;
    private static entityIntersectHelper?: EntityIntersectHelper;
    private static pointerEvents?: PointerEvents;
    private static canvasMetrics?: CanvasMetrics;
    private static pointer?: Pointer;
    private static bodyUserSelectPrev?: string;
    private static bodyWebkitUserSelectPrev?: string;
    private static bodyMozUserSelectPrev?: string;
    private static bodyMsUserSelectPrev?: string;
    private static canvas?: HTMLCanvasElement;
    static async main(mixFileLoader: any, gameMapFile: any, parentElement: HTMLElement, _strings: any, context: TestToolRuntimeContext = {}): Promise<void> {
        await TestToolSupport.ensureTheater(TheaterType.Temperate, context.cdnResourceLoader, [ResourceType.UiAlly, ResourceType.Vxl, ResourceType.Anims]);
        this.buildHomeButton();
        const hostElement = TestToolSupport.prepareHost(context, 800, 600);
        const renderer = (this.renderer = new Renderer(800, 600));
        renderer.init(hostElement);
        TestToolSupport.placeRendererCanvas(renderer, 0, 0);
        renderer.initStats(document.body);
        this.disposables.add(renderer);
        const worldScene = (this.worldScene = WorldScene.factory({ x: 0, y: 0, width: 800, height: 600 }, new BoxedVar(true), new BoxedVar(ShadowQuality.High)));
        this.disposables.add(worldScene);
        IsoCoords.init({ x: 0, y: 0 });
        worldScene.create3DObject();
        (worldScene.scene as any).background = new (THREE as any).Color(0xE0E0E0);
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
        const panningHelper = new MapPanningHelper(gameMap as any);
        worldScene.cameraPan.setPanLimits((panningHelper as any).computeCameraPanLimits(worldScene.viewport, mapScreenBounds));
        const start = (gameMap as any).startingLocations?.[0] ?? { x: Math.floor(localSize.x + localSize.width / 2), y: Math.floor(localSize.y + localSize.height / 2) };
        const initialPan = (panningHelper as any).computeCameraPanFromTile(start.x, start.y);
        worldScene.cameraPan.setPan(initialPan);
        const centerWorld = IsoCoords.screenTileToWorld(localSize.x + localSize.width / 2, localSize.y + localSize.height / 2);
        worldScene.setLightFocusPoint(centerWorld.x, centerWorld.y);
        const world = new World();
        const player = new Player("Tester");
        const playerList = new PlayerList();
        playerList.addPlayer(player);
        const alliances = new Alliances(playerList);
        const unitSelection = new UnitSelection();
        const nextObjectId = new BoxedVar(1);
        const objectFactory = new ObjectFactory((gameMap as any).tiles, (gameMap as any).tileOccupation, (gameMap as any).bridges, nextObjectId);
        try {
            const desiredColor = (rules as any).getMultiplayerColors?.().get?.("DarkRed");
            if (desiredColor)
                (player as any).color = desiredColor;
        }
        catch { }
        const botManager = { init() { }, update() { }, dispose() { } } as any;
        const gameOpts: any = {
            gameMode: 0,
            gameSpeed: 5,
            credits: 10000,
            unitCount: 0,
            shortGame: true,
            superWeapons: false,
            buildOffAlly: false,
            mcvRepacks: false,
            cratesAppear: false,
            destroyableBridges: true,
            multiEngineer: false,
            noDogEngiKills: false,
            mapName: "mp03t4.map",
            mapTitle: "Test",
            mapDigest: "",
            mapSizeBytes: 0,
            maxSlots: 2,
            mapOfficial: true,
            humanPlayers: [],
            aiPlayers: []
        };
        const game = (this.game = new Game(world, gameMap, rules, art, {}, 1, Date.now(), gameOpts, "Standard", playerList, unitSelection, alliances, nextObjectId, objectFactory, botManager));
        (game as any).mapShroudTrait = { getPlayerShroud() { return undefined; } };
        (game as any).crateGeneratorTrait = { peekInsideCrate() { return undefined; }, pickupCrate() { } };
        game.sellTrait = new SellTrait(game, game.rules.general);
        game.traits.add(game.sellTrait);
        const infantryTypes = [...(rules as any).infantryRules.keys()].filter((name: string) => art.hasObject(name, ObjectType.Infantry));
        const infantryName = infantryTypes[0] ?? "E1";
        const unit = objectFactory.create(ObjectType.Infantry, infantryName, rules as any, art as any);
        game.changeObjectOwner(unit, player);
        const startTile = (gameMap as any).tiles.getByMapCoords(start.x, start.y);
        game.spawnObject(unit, startTile);
        unitSelection.addToSelection(unit);
        this.currentUnit = unit;
        let vehicle: any | undefined;
        const vehicleTypes = [...(rules as any).vehicleRules.keys()].filter((name: string) => art.hasObject(name, ObjectType.Vehicle));
        if (vehicleTypes.length) {
            vehicle = objectFactory.create(ObjectType.Vehicle, vehicleTypes[0], rules as any, art as any);
            game.changeObjectOwner(vehicle, player);
            const vTile = (gameMap as any).tiles.getByMapCoords(Math.min(start.x + 1, localSize.x + localSize.width - 1), start.y);
            game.spawnObject(vehicle, vTile ?? startTile);
            this.currentVehicle = vehicle;
        }
        let aircraft: any | undefined;
        const aircraftTypes = [...(rules as any).aircraftRules.keys()].filter((name: string) => art.hasObject(name, ObjectType.Aircraft));
        if (aircraftTypes.length) {
            aircraft = objectFactory.create(ObjectType.Aircraft, aircraftTypes[0], rules as any, art as any);
            game.changeObjectOwner(aircraft, player);
            const aTile = (gameMap as any).tiles.getByMapCoords(start.x, Math.min(start.y + 1, localSize.y + localSize.height - 1));
            game.spawnObject(aircraft, aTile ?? startTile);
            this.currentAircraft = aircraft;
        }
        try {
            const buildingTypes = [...(rules as any).buildingRules.keys()].filter((name: string) => art.hasObject(name, ObjectType.Building));
            const pickCount = Math.min(3, buildingTypes.length);
            const offsets = [
                { dx: 16, dy: 5 },
                { dx: 8, dy: 0 },
                { dx: 3, dy: 8 }
            ];
            for (let i = 0; i < pickCount; i++) {
                const name = buildingTypes[i];
                const b = objectFactory.create(ObjectType.Building, name, rules as any, art as any);
                game.changeObjectOwner(b, player);
                const ox = offsets[i % offsets.length].dx;
                const oy = offsets[i % offsets.length].dy;
                const bx = Math.min(Math.max(localSize.x, start.x + ox), localSize.x + localSize.width - 1);
                const by = Math.min(Math.max(localSize.y, start.y + oy), localSize.y + localSize.height - 1);
                const bTile = (gameMap as any).tiles.getByMapCoords(bx, by) ?? startTile;
                game.spawnObject(b, bTile);
            }
        }
        catch (e) {
            console.warn('[UnitMovementTester] Failed to spawn buildings:', e);
        }
        const vxlFactory = new VxlBuilderFactory(new VxlGeometryPool(new VxlGeometryCache(null, null)), false, worldScene.camera);
        const renderableFactory = new RenderableFactory(new BoxedVar(player) as any, unitSelection as any, alliances as any, rules as any, art as any, mapRenderable as any, imageFinder as any, Engine.getPalettes() as any, Engine.getVoxels() as any, Engine.getVoxelAnims() as any, theater as any, worldScene.camera as any, lighting, lightingDirector as any, new BoxedVar(false) as any, new BoxedVar(false) as any, new BoxedVar(1) as any, null as any, new Strings({ TXT_PRIMARY: "Primary" }) as any, new BoxedVar(FlyerHelperMode.Selected) as any, new BoxedVar(false) as any, vxlFactory as any, new Map() as any, false, false);
        const renderableManager = (this.renderableManager = new RenderableManager(world, worldScene, worldScene.camera as any, renderableFactory));
        renderableManager.init();
        this.disposables.add(renderableManager, () => (this.renderableManager = undefined));
        const renderable = renderableManager.getRenderableByGameObject(unit);
        renderable.selectionModel.setSelectionLevel(SelectionLevel.Selected);
        renderable.selectionModel.setControlGroupNumber(1);
        const vRenderable = vehicle ? renderableManager.getRenderableByGameObject(vehicle) : undefined;
        const aRenderable = aircraft ? renderableManager.getRenderableByGameObject(aircraft) : undefined;
        vRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
        vRenderable?.selectionModel.setControlGroupNumber(2);
        aRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
        aRenderable?.selectionModel.setControlGroupNumber(3);
        this.buildUnitSwitchUI({
            onSelectInfantry: () => {
                this.currentUnit = unit;
                renderable.selectionModel.setSelectionLevel(SelectionLevel.Selected);
                vRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
                aRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
            },
            onSelectVehicle: () => {
                if (!vehicle)
                    return;
                this.currentUnit = vehicle;
                renderable.selectionModel.setSelectionLevel(SelectionLevel.None);
                vRenderable?.selectionModel.setSelectionLevel(SelectionLevel.Selected);
                aRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
            },
            onSelectAircraft: () => {
                if (!aircraft)
                    return;
                this.currentUnit = aircraft;
                renderable.selectionModel.setSelectionLevel(SelectionLevel.None);
                vRenderable?.selectionModel.setSelectionLevel(SelectionLevel.None);
                aRenderable?.selectionModel.setSelectionLevel(SelectionLevel.Selected);
            }
        });
        const canvasMetrics = (this.canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window));
        canvasMetrics.init();
        this.disposables.add(() => canvasMetrics.dispose());
        let pointerEvents: PointerEvents | undefined;
        try {
            const mouseShp = (Engine as any).images?.get?.('mouse.shp');
            const mousePal = (Engine as any).palettes?.get?.('mousepal.pal');
            if (mouseShp && mousePal) {
                const pointer = (this.pointer = Pointer.factory(mouseShp, mousePal, renderer as any, document, canvasMetrics as any, new BoxedVar(false)));
                pointer.init();
                try {
                    await pointer.getPointerLock().exit();
                }
                catch { }
                worldScene.add(pointer.getSprite() as any);
                pointerEvents = new PointerEvents(renderer as any, { x: 0, y: 0 }, document, canvasMetrics as any);
            }
        }
        catch { }
        if (!pointerEvents) {
            pointerEvents = new PointerEvents(renderer as any, { x: 0, y: 0 }, document, canvasMetrics as any);
        }
        this.pointerEvents = pointerEvents;
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        cameraZoomControls.init();
        this.disposables.add(pointerEvents, cameraZoomControls);
        const canvas = renderer.getCanvas();
        this.canvas = canvas;
        const tileHelper = new MapTileIntersectHelper(gameMap as any, worldScene as any);
        const raycastHelper = new RaycastHelper({ viewport: worldScene.viewport as any, camera: (worldScene as any).camera });
        const worldViewportHelper = new WorldViewportHelper(worldScene as any);
        this.entityIntersectHelper = new EntityIntersectHelper(gameMap as any, renderableManager as any, tileHelper as any, raycastHelper as any, worldScene as any, worldViewportHelper as any);
        const ensureSelectBox = () => {
            if (!this.selectBoxEl) {
                const el = document.createElement('div');
                el.style.position = 'fixed';
                el.style.border = '1px solid #4aa3ff';
                el.style.background = 'rgba(74,163,255,0.15)';
                el.style.pointerEvents = 'none';
                el.style.display = 'none';
                el.style.zIndex = '1002';
                document.body.appendChild(el);
                this.selectBoxEl = el;
                this.disposables.add(() => el.remove());
            }
        };
        ensureSelectBox();
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        const domDown = (e: MouseEvent) => {
            try {
                console.info('[UnitMovementTester] DOM mousedown', { button: e.button, x: (e as any).offsetX, y: (e as any).offsetY });
            }
            catch { }
        };
        const domUp = (e: MouseEvent) => {
            try {
                console.info('[UnitMovementTester] DOM mouseup', { button: e.button, x: (e as any).offsetX, y: (e as any).offsetY });
            }
            catch { }
        };
        canvas.addEventListener('mousedown', domDown, true);
        canvas.addEventListener('mouseup', domUp, true);
        this.disposables.add(() => {
            canvas.removeEventListener('mousedown', domDown, true);
            canvas.removeEventListener('mouseup', domUp, true);
        });
        const onMouseDown = (ev: any) => {
            try {
                console.info('[UnitMovementTester] onMouseDown', { btn: ev.button, x: ev.pointer?.x, y: ev.pointer?.y });
            }
            catch { }
            if (ev.button !== 0)
                return;
            const x = ev.pointer.x;
            const y = ev.pointer.y;
            this.dragStart = { x, y };
            this.isDragging = false;
            this.setPointer(PointerType.Select);
            this.bodyUserSelectPrev = document.body.style.userSelect;
            this.bodyWebkitUserSelectPrev = (document.body.style as any).webkitUserSelect;
            this.bodyMozUserSelectPrev = (document.body.style as any).MozUserSelect;
            this.bodyMsUserSelectPrev = (document.body.style as any).msUserSelect;
            document.body.style.userSelect = 'none';
            (document.body.style as any).webkitUserSelect = 'none';
            (document.body.style as any).MozUserSelect = 'none';
            (document.body.style as any).msUserSelect = 'none';
            if (this.pointerEvents)
                this.pointerEvents.intersectionsEnabled = false;
        };
        const onMouseMove = (ev: any) => {
            if (!this.dragStart)
                return;
            const x = ev.pointer.x;
            const y = ev.pointer.y;
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            const withinClick = Math.abs(dx) <= this.dragThreshold && Math.abs(dy) <= this.dragThreshold;
            if (!this.isDragging && !withinClick) {
                this.isDragging = true;
                if (this.selectBoxEl)
                    this.selectBoxEl.style.display = 'block';
                this.setPointer(PointerType.Pan);
            }
            if (this.isDragging && this.selectBoxEl) {
                const left = this.canvasMetrics!.x + Math.min(this.dragStart.x, x);
                const top = this.canvasMetrics!.y + Math.min(this.dragStart.y, y);
                const width = Math.abs(dx);
                const height = Math.abs(dy);
                this.selectBoxEl.style.left = `${left}px`;
                this.selectBoxEl.style.top = `${top}px`;
                this.selectBoxEl.style.width = `${width}px`;
                this.selectBoxEl.style.height = `${height}px`;
            }
            try {
                console.info('[UnitMovementTester] onMouseMove', { x, y, dx, dy, withinClick, isDragging: this.isDragging });
            }
            catch { }
        };
        const onHoverMove = (ev: any) => {
            if (this.isDragging || this.dragStart)
                return;
            const x = ev.pointer.x;
            const y = ev.pointer.y;
            const hit = this.entityIntersectHelper!.getEntityAtScreenPoint({ x, y }) as any;
            if (hit?.renderable?.gameObject?.isUnit && hit.renderable.gameObject.isUnit()) {
                this.setPointer(PointerType.Select);
            }
            else {
                const hasSelection = unitSelection.getSelectedUnits().length > 0;
                this.setPointer(hasSelection ? PointerType.Move : PointerType.Default);
            }
        };
        const applySelection = (screenBox: any, additive: boolean) => {
            const THREE_NS: any = (window as any).THREE || (THREE as any);
            const box = new THREE_NS.Box2(new THREE_NS.Vector2(screenBox.min.x, screenBox.min.y), new THREE_NS.Vector2(screenBox.max.x, screenBox.max.y));
            const results = this.entityIntersectHelper!.getEntitiesAtScreenBox(box) as any[];
            try {
                console.info('[UnitMovementTester] Box select:', {
                    box: screenBox,
                    results: results?.length ?? 0
                });
            }
            catch { }
            const units = results.map(r => r.gameObject).filter(obj => obj.isUnit && obj.isUnit());
            if (!additive)
                unitSelection.deselectAll();
            units.forEach(u => unitSelection.addToSelection(u));
            const sel = unitSelection.getSelectedUnits();
            if (sel.length)
                this.currentUnit = sel[0];
        };
        const onMouseUp = (ev: any) => {
            try {
                console.info('[UnitMovementTester] onMouseUp', { btn: ev.button, x: ev.pointer?.x, y: ev.pointer?.y });
            }
            catch { }
            const x = ev.pointer.x;
            const y = ev.pointer.y;
            const shift = ev.shiftKey || ev.metaKey || ev.ctrlKey;
            if (ev.button === 0) {
                const dx = x - (this.dragStart?.x ?? x);
                const dy = y - (this.dragStart?.y ?? y);
                const withinClick = Math.abs(dx) <= this.dragThreshold && Math.abs(dy) <= this.dragThreshold;
                if (this.dragStart && !withinClick) {
                    if (this.selectBoxEl) {
                        this.selectBoxEl.style.display = 'none';
                    }
                    const minX = Math.min(this.dragStart.x, x);
                    const minY = Math.min(this.dragStart.y, y);
                    const maxX = Math.max(this.dragStart.x, x);
                    const maxY = Math.max(this.dragStart.y, y);
                    applySelection({ min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }, shift);
                    this.setPointer(PointerType.Default);
                }
                else {
                    const hit = this.entityIntersectHelper!.getEntityAtScreenPoint({ x, y }) as any;
                    try {
                        console.info('[UnitMovementTester] Click at', { x, y, hit: !!hit, unit: !!hit?.renderable?.gameObject?.isUnit && hit.renderable.gameObject.isUnit() });
                    }
                    catch { }
                    if (hit?.renderable?.gameObject?.isUnit && hit.renderable.gameObject.isUnit()) {
                        unitSelection.deselectAll();
                        unitSelection.addToSelection(hit.renderable.gameObject);
                        this.currentUnit = hit.renderable.gameObject;
                        this.setPointer(PointerType.Default);
                    }
                    else {
                        const tile = tileHelper.getTileAtScreenPoint({ x, y });
                        try {
                            console.info('[UnitMovementTester] Ground click tile:', tile ? { rx: tile.rx, ry: tile.ry, z: tile.z } : null);
                        }
                        catch { }
                        if (tile) {
                            const target = game.createTarget(undefined, tile);
                            const selected = unitSelection.getSelectedUnits();
                            try {
                                console.info('[UnitMovementTester] Move order selected count:', selected?.length ?? 0);
                            }
                            catch { }
                            selected.forEach((u: any) => {
                                const order = new MoveOrder(game as any, gameMap as any, unitSelection as any, false).set(u, target);
                                (u as any).unitOrderTrait.addOrder(order as any, false);
                            });
                            this.setPointer(PointerType.Move);
                        }
                        else {
                            try {
                                const alt = (tileHelper as any).intersectTilesByScreenPos({ x, y });
                                console.warn('[UnitMovementTester] No tile at click. Nearby candidates:', alt?.slice?.(0, 3));
                            }
                            catch { }
                        }
                    }
                }
            }
            else if (ev.button === 2) {
                unitSelection.deselectAll();
                this.setPointer(PointerType.Default);
            }
            if (this.bodyUserSelectPrev !== undefined) {
                document.body.style.userSelect = this.bodyUserSelectPrev;
                (document.body.style as any).webkitUserSelect = this.bodyWebkitUserSelectPrev ?? '';
                (document.body.style as any).MozUserSelect = this.bodyMozUserSelectPrev ?? '';
                (document.body.style as any).msUserSelect = this.bodyMsUserSelectPrev ?? '';
                this.bodyUserSelectPrev = undefined;
                this.bodyWebkitUserSelectPrev = undefined;
                this.bodyMozUserSelectPrev = undefined;
                this.bodyMsUserSelectPrev = undefined;
            }
            this.dragStart = undefined;
            this.isDragging = false;
            if (this.pointerEvents)
                this.pointerEvents.intersectionsEnabled = true;
        };
        pointerEvents.addEventListener('canvas', 'mousedown', onMouseDown);
        pointerEvents.addEventListener('canvas', 'mousemove', onMouseMove);
        pointerEvents.addEventListener('canvas', 'mousemove', onHoverMove);
        pointerEvents.addEventListener('canvas', 'mouseup', onMouseUp);
        this.disposables.add(() => {
            pointerEvents!.removeEventListener('canvas', 'mousedown', onMouseDown);
            pointerEvents!.removeEventListener('canvas', 'mousemove', onMouseMove);
            pointerEvents!.removeEventListener('canvas', 'mousemove', onHoverMove);
            pointerEvents!.removeEventListener('canvas', 'mouseup', onMouseUp);
        });
        const onDocMouseUp = () => {
            if (this.bodyUserSelectPrev !== undefined) {
                document.body.style.userSelect = this.bodyUserSelectPrev;
                (document.body.style as any).webkitUserSelect = this.bodyWebkitUserSelectPrev ?? '';
                (document.body.style as any).MozUserSelect = this.bodyMozUserSelectPrev ?? '';
                (document.body.style as any).msUserSelect = this.bodyMsUserSelectPrev ?? '';
                this.bodyUserSelectPrev = undefined;
                this.bodyWebkitUserSelectPrev = undefined;
                this.bodyMozUserSelectPrev = undefined;
                this.bodyMsUserSelectPrev = undefined;
            }
            if (this.isDragging && this.selectBoxEl)
                this.selectBoxEl.style.display = 'none';
            this.dragStart = undefined;
            this.isDragging = false;
            if (this.pointerEvents)
                this.pointerEvents.intersectionsEnabled = true;
        };
        document.addEventListener('mouseup', onDocMouseUp, false);
        this.disposables.add(() => document.removeEventListener('mouseup', onDocMouseUp, false));
        const panKeys = { left: false, right: false, up: false, down: false, shift: false } as any;
        const setKey = (e: KeyboardEvent, isDown: boolean) => {
            const key = e.key;
            const kc = (e as any).keyCode;
            const before = { ...panKeys };
            switch (key) {
                case 'ArrowLeft':
                    panKeys.left = isDown;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    panKeys.right = isDown;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    panKeys.up = isDown;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    panKeys.down = isDown;
                    e.preventDefault();
                    break;
                case 'Left':
                    panKeys.left = isDown;
                    e.preventDefault();
                    break;
                case 'Right':
                    panKeys.right = isDown;
                    e.preventDefault();
                    break;
                case 'Up':
                    panKeys.up = isDown;
                    e.preventDefault();
                    break;
                case 'Down':
                    panKeys.down = isDown;
                    e.preventDefault();
                    break;
                case 'Shift':
                    panKeys.shift = isDown;
                    break;
                default:
                    if (kc === 37) {
                        panKeys.left = isDown;
                        e.preventDefault();
                    }
                    else if (kc === 39) {
                        panKeys.right = isDown;
                        e.preventDefault();
                    }
                    else if (kc === 38) {
                        panKeys.up = isDown;
                        e.preventDefault();
                    }
                    else if (kc === 40) {
                        panKeys.down = isDown;
                        e.preventDefault();
                    }
                    else if (kc === 16) {
                        panKeys.shift = isDown;
                    }
            }
            try {
                console.info('[UnitMovementTester] key', isDown ? 'down' : 'up', { key, keyCode: kc, target: (e.target as any)?.tagName, panKeys, before });
            }
            catch { }
        };
        const onKeyDown = (e: KeyboardEvent) => setKey(e, true);
        const onKeyUp = (e: KeyboardEvent) => setKey(e, false);
        try {
            this.canvas?.setAttribute('tabindex', '0');
            this.canvas?.focus({ preventScroll: true } as any);
            this.canvas?.addEventListener('click', () => {
                try {
                    (this.canvas as any)?.focus?.({ preventScroll: true });
                }
                catch { }
            });
            console.info('[UnitMovementTester] keyboard listeners: focusing canvas', { active: (document.activeElement as any)?.tagName });
        }
        catch { }
        window.addEventListener('keydown', onKeyDown, { passive: false, capture: true });
        window.addEventListener('keyup', onKeyUp, { passive: false, capture: true });
        this.canvas?.addEventListener('keydown', onKeyDown as any);
        this.canvas?.addEventListener('keyup', onKeyUp as any);
        const prevDocOnKeyDown = (document as any).onkeydown;
        const prevDocOnKeyUp = (document as any).onkeyup;
        const prevWinOnKeyDown = (window as any).onkeydown;
        const prevWinOnKeyUp = (window as any).onkeyup;
        (document as any).onkeydown = (ev: KeyboardEvent) => { try {
            onKeyDown(ev);
        }
        finally {
            return false;
        } };
        (document as any).onkeyup = (ev: KeyboardEvent) => { try {
            onKeyUp(ev);
        }
        finally {
            return false;
        } };
        ;
        (window as any).onkeydown = (ev: KeyboardEvent) => { try {
            onKeyDown(ev);
        }
        finally {
            return false;
        } };
        ;
        (window as any).onkeyup = (ev: KeyboardEvent) => { try {
            onKeyUp(ev);
        }
        finally {
            return false;
        } };
        this.disposables.add(() => {
            window.removeEventListener('keydown', onKeyDown as any, true as any);
            window.removeEventListener('keyup', onKeyUp as any, true as any);
            this.canvas?.removeEventListener('keydown', onKeyDown as any);
            this.canvas?.removeEventListener('keyup', onKeyUp as any);
            (document as any).onkeydown = prevDocOnKeyDown;
            (document as any).onkeyup = prevDocOnKeyUp;
            (window as any).onkeydown = prevWinOnKeyDown;
            (window as any).onkeyup = prevWinOnKeyUp;
        });
        const panInterval = window.setInterval(() => {
            const dx = (panKeys.right ? 1 : 0) - (panKeys.left ? 1 : 0);
            const dy = (panKeys.down ? 1 : 0) - (panKeys.up ? 1 : 0);
            if (!dx && !dy)
                return;
            const step = (panKeys.shift ? 24 : 12);
            const cur = worldScene.cameraPan.getPan();
            const next = { x: cur.x + dx * step, y: cur.y + dy * step };
            try {
                console.info('[UnitMovementTester] panTick', { dx, dy, step, cur, next });
            }
            catch { }
            worldScene.cameraPan.setPan(next);
        }, 32);
        this.disposables.add(() => clearInterval(panInterval));
        renderer.addScene(worldScene);
        const uiLoop = (this.uiAnimationLoop = new UiAnimationLoop(renderer));
        uiLoop.start();
        this.disposables.add(() => uiLoop.destroy());
        this.gameTickTimer = window.setInterval(() => {
            try {
                game.update();
            }
            catch (e) {
                console.error("[UnitMovementTester] game.update failed", e);
            }
        }, 33);
        this.disposables.add(() => {
            if (this.gameTickTimer) {
                clearInterval(this.gameTickTimer);
                this.gameTickTimer = undefined;
            }
        });
        TestToolSupport.setState('unitmovement', {
            mapWidth: gameMapFile.fullSize.width,
            mapHeight: gameMapFile.fullSize.height,
            hasInfantry: Boolean(unit),
            hasVehicle: Boolean(vehicle),
            hasAircraft: Boolean(aircraft),
        });
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
    private static buildUnitSwitchUI(handlers: {
        onSelectInfantry: () => void;
        onSelectVehicle: () => void;
        onSelectAircraft: () => void;
    }): void {
        if (this.unitSwitchEl) {
            this.unitSwitchEl.remove();
        }
        const box = (this.unitSwitchEl = document.createElement('div'));
        box.style.cssText = `
      position: fixed;
      left: 10px;
      top: 10px;
      z-index: 1001;
      background: rgba(255,255,255,0.8);
      border: 1px solid #999;
      padding: 8px;
      border-radius: 4px;
      display: flex;
      gap: 6px;
    `;
        const btnInf = document.createElement('button');
        btnInf.innerText = '步兵';
        btnInf.onclick = handlers.onSelectInfantry;
        const btnVeh = document.createElement('button');
        btnVeh.innerText = '坦克';
        btnVeh.onclick = handlers.onSelectVehicle;
        const btnAir = document.createElement('button');
        btnAir.innerText = '飞机';
        btnAir.onclick = handlers.onSelectAircraft;
        box.appendChild(btnInf);
        box.appendChild(btnVeh);
        box.appendChild(btnAir);
        document.body.appendChild(box);
        this.disposables.add(() => box.remove());
    }
    static destroy(): void {
        TestToolSupport.clearState('unitmovement');
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
    private static setPointer(type: PointerType): void {
        if (this.pointer) {
            this.pointer.setPointerType(type);
            return;
        }
        const canvas = this.canvas as HTMLCanvasElement | undefined;
        if (!canvas)
            return;
        switch (type) {
            case PointerType.Select:
                canvas.style.cursor = 'pointer';
                break;
            case PointerType.Move:
                canvas.style.cursor = 'crosshair';
                break;
            case PointerType.Pan:
                canvas.style.cursor = 'grabbing';
                break;
            default:
                canvas.style.cursor = 'default';
                break;
        }
    }
}
