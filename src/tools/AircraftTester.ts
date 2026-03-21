import { Renderer } from "@/engine/gfx/Renderer";
import { Engine } from "@/engine/Engine";
import { Coords } from "@/game/Coords";
import { IsoCoords } from "@/engine/IsoCoords";
import { Player } from "@/game/Player";
import { WorldScene } from "@/engine/renderable/WorldScene";
import { Rules } from "@/game/rules/Rules";
import { MapGrid } from "@/engine/renderable/entity/map/MapGrid";
import { BoxedVar } from "@/util/BoxedVar";
import { UiAnimationLoop } from "@/engine/UiAnimationLoop";
import { ImageFinder } from "@/engine/ImageFinder";
import { Art } from "@/game/art/Art";
import { RenderableFactory } from "@/engine/renderable/entity/RenderableFactory";
import { TheaterType } from "@/engine/TheaterType";
import { Alliances } from "@/game/Alliances";
import { PlayerList } from "@/game/PlayerList";
import { SelectionLevel } from "@/game/gameobject/selection/SelectionLevel";
import { VeteranLevel } from "@/game/gameobject/unit/VeteranLevel";
import { PointerEvents } from "@/gui/PointerEvents";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { UnitSelection } from "@/game/gameobject/selection/UnitSelection";
import { CameraZoomControls } from "@/tools/CameraZoomControls";
import { Lighting } from "@/engine/Lighting";
import { ObjectFactory } from "@/game/gameobject/ObjectFactory";
import { TileCollection } from "@/game/map/TileCollection";
import { ObjectType } from "@/engine/type/ObjectType";
import { MoveState } from "@/game/gameobject/trait/MoveTrait";
import { TileOccupation } from "@/game/map/TileOccupation";
import { Bridges } from "@/game/map/Bridges";
import { RenderableManager } from "@/engine/RenderableManager";
import { World } from "@/game/World";
import { Strings } from "@/data/Strings";
import { MapBounds } from "@/game/map/MapBounds";
import { FlyerHelperMode } from "@/engine/renderable/entity/unit/FlyerHelperMode";
import { VxlBuilderFactory } from "@/engine/renderable/builder/VxlBuilderFactory";
import { VxlGeometryPool } from "@/engine/renderable/builder/vxlGeometry/VxlGeometryPool";
import { VxlGeometryCache } from "@/engine/gfx/geometry/VxlGeometryCache";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
import { CanvasMetrics } from "@/gui/CanvasMetrics";
import { PipOverlay } from "@/engine/renderable/entity/PipOverlay";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { LightingDirector } from "@/engine/gfx/lighting/LightingDirector";
import { ResourceType } from "@/engine/resourceConfigs";
import { TestToolSupport, type TestToolRuntimeContext } from "@/tools/TestToolSupport";
declare const THREE: any;
export class AircraftTester {
    private static disposables = new CompositeDisposable();
    private static renderer: Renderer;
    private static theater: any;
    private static rules: Rules;
    private static art: Art;
    private static images: any;
    private static voxels: any;
    private static voxelAnims: any;
    private static uiAnimationLoop: UiAnimationLoop;
    private static worldScene: WorldScene;
    private static world: World;
    private static currentRenderable: any;
    private static currentAircraft: any;
    private static listEl: HTMLDivElement;
    private static controlsEl: HTMLDivElement | undefined;
    private static hostElement?: HTMLElement;
    private static vxlGeometryPool: VxlGeometryPool;
    private static currentAircraftType?: string;
    static async main(_args: any, context: TestToolRuntimeContext = {}): Promise<void> {
        await TestToolSupport.ensureTheater(TheaterType.Temperate, context.cdnResourceLoader, [ResourceType.Vxl, ResourceType.Anims]);
        const hostElement = this.hostElement = TestToolSupport.prepareHost(context, 1224, 600);
        const renderer = (this.renderer = new Renderer(800, 600));
        renderer.init(hostElement);
        TestToolSupport.placeRendererCanvas(renderer, 212, 0);
        renderer.initStats(document.body);
        this.buildHomeButton();
        const worldScene = WorldScene.factory({ x: 0, y: 0, width: 800, height: 600 }, new BoxedVar(true), new BoxedVar(ShadowQuality.High));
        this.disposables.add(worldScene);
        (worldScene.scene.background as any) = new THREE.Color(12632256);
        IsoCoords.init({ x: 0, y: 0 });
        this.theater = await Engine.loadTheater(TheaterType.Temperate);
        const rules = new Rules(Engine.getRules());
        this.rules = rules;
        this.art = new Art(rules as any, Engine.getArt(), undefined as any, console);
        this.images = Engine.getImages();
        this.voxels = Engine.getVoxels();
        this.voxelAnims = Engine.getVoxelAnims();
        this.buildBrowser(rules["aircraftRules"] as Map<string, any>);
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(() => canvasMetrics.dispose());
        const pointerEvents = new PointerEvents(renderer as any, { x: 0, y: 0 }, document, canvasMetrics as any);
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        cameraZoomControls.init();
        this.disposables.add(pointerEvents, cameraZoomControls);
        renderer.addScene(worldScene);
        const uiAnimationLoop = (this.uiAnimationLoop = new UiAnimationLoop(renderer));
        uiAnimationLoop.start();
        this.worldScene = worldScene;
        this.vxlGeometryPool = new VxlGeometryPool(new VxlGeometryCache(null, null));
        this.addGrid();
        this.createFloor();
        this.syncState();
    }
    static addGrid(): void {
        const mapGrid = new MapGrid({ width: 10, height: 10 });
        const gridObject = mapGrid.get3DObject();
        const container = new THREE.Object3D();
        container.add(gridObject);
        this.worldScene.scene.add(container);
    }
    static createFloor(): void {
        const geometry = new THREE.PlaneGeometry(10000, 10000);
        const material = new THREE.ShadowMaterial();
        material.opacity = 0.5;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        mesh.renderOrder = 200000;
        this.worldScene.scene.add(mesh);
    }
    static selectAircraft(aircraftType: string): void {
        if (this.currentAircraft && !this.currentAircraft.isDisposed) {
            this.world.removeObject(this.currentAircraft);
            this.currentAircraft.dispose();
        }
        const player = new Player("Player");
        this.disposables.add(player);
        const desiredColor = this.rules.getMultiplayerColors().get("DarkRed")!;
        (player as any).color = desiredColor;
        const playerList = new PlayerList();
        playerList.addPlayer(player);
        const alliances = new Alliances(playerList);
        const unitSelection = new UnitSelection();
        const lighting = new Lighting();
        this.disposables.add(lighting);
        const renderableFactory = new RenderableFactory(new BoxedVar(player) as any, unitSelection as any, alliances as any, this.rules as any, this.art as any, undefined as any, new ImageFinder(this.images, this.theater) as any, Engine.getPalettes() as any, this.voxels as any, this.voxelAnims as any, this.theater as any, this.worldScene.camera as any, new Lighting(), new LightingDirector(new Lighting().mapLighting, this.renderer as any, new BoxedVar(1) as any) as any, new BoxedVar(false) as any, new BoxedVar(false) as any, new BoxedVar(2) as any, undefined as any, new Strings() as any, new BoxedVar(FlyerHelperMode.Selected) as any, new BoxedVar(false) as any, new VxlBuilderFactory(this.vxlGeometryPool, false, this.worldScene.camera) as any, new Map() as any);
        const tileCollection = new TileCollection([
            { rx: 0, ry: 0, dx: 0, dy: 0, z: 0, tileNum: 0, subTile: 0 },
            { rx: 1, ry: 0, dx: 1, dy: 0, z: 0, tileNum: 0, subTile: 0 },
            { rx: 0, ry: 1, dx: 0, dy: 1, z: 0, tileNum: 0, subTile: 0 },
            { rx: 1, ry: 1, dx: 1, dy: 1, z: 0, tileNum: 0, subTile: 0 },
        ] as any, this.theater.tileSets as any, this.rules.general as any, () => 0);
        const tileOccupation = new TileOccupation(tileCollection);
        const mapBounds = new MapBounds();
        const bridges = new Bridges(this.theater.tileSets, tileCollection, tileOccupation, mapBounds, this.rules);
        const aircraft = (this.currentAircraft = new ObjectFactory(tileCollection, tileOccupation, bridges, new BoxedVar(0)).create(ObjectType.Aircraft, aircraftType, this.rules as any, this.art as any));
        this.currentAircraftType = aircraftType;
        aircraft.owner = player;
        aircraft.position.tile = { rx: 1, ry: 1, z: 0, rampType: 0 };
        const world = (this.world = new World());
        const renderableManager = new RenderableManager(world, this.worldScene, this.worldScene.camera, renderableFactory);
        renderableManager.init();
        this.disposables.add(renderableManager);
        world.spawnObject(aircraft);
        const renderable = (this.currentRenderable = renderableManager.getRenderableByGameObject(aircraft));
        renderable.selectionModel.setSelectionLevel(SelectionLevel.None);
        renderable.selectionModel.setControlGroupNumber(3);
        this.buildControls();
        this.syncState();
    }
    static buildControls(): void {
        if (this.controlsEl) {
            this.controlsEl.remove();
        }
        const controls = (this.controlsEl = document.createElement("div"));
        controls.dataset.testid = "aircraft-controls";
        controls.style.position = "absolute";
        controls.style.left = "0";
        controls.style.top = "0";
        controls.style.width = "200px";
        controls.style.padding = "5px";
        controls.style.background = "rgba(255, 255, 255, 0.5)";
        controls.style.border = "1px black solid";
        controls.appendChild(document.createTextNode("Remap color:"));
        const colorMap = new Map(this.rules.getMultiplayerColors());
        const colorSelect = document.createElement("select");
        colorSelect.dataset.testid = "aircraft-color";
        colorSelect.style.display = "block";
        colorSelect.addEventListener("change", () => {
            this.currentAircraft.owner.color = colorMap.get(colorSelect.value);
            this.syncState();
        });
        controls.appendChild(colorSelect);
        colorMap.forEach((color, name) => {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = name;
            option.selected = color.asHex() === this.currentAircraft.owner.color.asHex();
            colorSelect.appendChild(option);
        });
        controls.appendChild(document.createTextNode("Selection level:"));
        const selDiv = document.createElement("div");
        controls.appendChild(selDiv);
        [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected].forEach((level) => {
            const btn = document.createElement("button");
            btn.innerHTML = SelectionLevel[level];
            btn.disabled = !this.currentAircraft.rules.selectable && level === SelectionLevel.Selected;
            btn.dataset.testid = `aircraft-selection-${SelectionLevel[level].toLowerCase()}`;
            btn.addEventListener("click", () => {
                this.currentRenderable.selectionModel.setSelectionLevel(level);
                this.syncState();
            });
            selDiv.appendChild(btn);
        });
        controls.appendChild(document.createTextNode("Veteran level:"));
        const vetDiv = document.createElement("div");
        controls.appendChild(vetDiv);
        if (this.currentAircraft.veteranTrait) {
            [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite].forEach((lvl) => {
                const btn = document.createElement("button");
                btn.innerHTML = VeteranLevel[lvl];
                btn.dataset.testid = `aircraft-veteran-${VeteranLevel[lvl].toLowerCase()}`;
                btn.addEventListener("click", () => {
                    this.currentAircraft.veteranTrait.veteranLevel = lvl;
                    this.syncState();
                });
                vetDiv.appendChild(btn);
            });
        }
        controls.appendChild(document.createTextNode("Rudder:"));
        const yaw = document.createElement("input");
        yaw.dataset.testid = "aircraft-yaw";
        yaw.style.display = "block";
        yaw.type = "range";
        yaw.min = "-180";
        yaw.max = "180";
        yaw.value = "0";
        yaw.addEventListener("input", () => {
            this.currentAircraft.yaw = Number(yaw.value);
            this.syncState();
        });
        controls.appendChild(yaw);
        const pitch = document.createElement("input");
        pitch.dataset.testid = "aircraft-pitch";
        pitch.style.display = "block";
        pitch.type = "range";
        pitch.min = "-180";
        pitch.max = "180";
        pitch.value = "0";
        pitch.addEventListener("input", () => {
            this.currentAircraft.pitch = Number(pitch.value);
            this.syncState();
        });
        controls.appendChild(pitch);
        const roll = document.createElement("input");
        roll.dataset.testid = "aircraft-roll";
        roll.style.display = "block";
        roll.type = "range";
        roll.min = "-180";
        roll.max = "180";
        roll.value = "0";
        roll.addEventListener("input", () => {
            this.currentAircraft.roll = Number(roll.value);
            this.syncState();
        });
        controls.appendChild(roll);
        controls.appendChild(document.createTextNode("Height:"));
        const height = document.createElement("input");
        height.dataset.testid = "aircraft-height";
        height.type = "range";
        height.min = "0";
        height.max = "2560";
        height.value = "0";
        height.style.display = "block";
        height.addEventListener("input", () => {
            this.currentAircraft.position.tileElevation = Coords.worldToTileHeight(Number(height.value));
            this.syncState();
        });
        controls.appendChild(height);
        controls.appendChild(document.createTextNode("isMoving:"));
        const moving = document.createElement("input");
        moving.dataset.testid = "aircraft-moving";
        moving.type = "checkbox";
        moving.style.display = "block";
        moving.addEventListener("change", (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            this.currentAircraft.moveTrait.moveState = checked ? MoveState.Moving : MoveState.Idle;
            this.currentAircraft.zone = checked ? ZoneType.Air : ZoneType.Ground;
            this.syncState();
        });
        controls.appendChild(moving);
        controls.appendChild(document.createTextNode("Warped out:"));
        const warped = document.createElement("input");
        warped.dataset.testid = "aircraft-warped";
        warped.type = "checkbox";
        warped.style.display = "block";
        warped.addEventListener("change", (e) => {
            this.currentAircraft.warpedOutTrait.debugSetActive((e.target as HTMLInputElement).checked);
            this.syncState();
        });
        controls.appendChild(warped);
        const destroy = document.createElement("button");
        destroy.dataset.testid = "aircraft-destroy";
        destroy.style.display = "block";
        destroy.style.color = "red";
        destroy.innerHTML = "DESTROY";
        destroy.addEventListener("click", async () => {
            this.currentAircraft.isDestroyed = true;
            this.world.removeObject(this.currentAircraft);
            this.currentAircraft.dispose();
            this.currentAircraft = undefined;
            this.currentAircraftType = undefined;
            this.controlsEl?.remove();
            this.controlsEl = undefined;
            this.syncState();
        });
        controls.appendChild(destroy);
        this.hostElement?.appendChild(controls);
        TestToolSupport.applyPanelTheme(controls);
        this.syncState();
    }
    private static syncState(): void {
        const aircraft = this.currentAircraft;
        const renderable = this.currentRenderable;
        const selectionLevel = renderable?.selectionModel?.getSelectionLevel?.();
        const veteranLevel = aircraft?.veteranTrait?.veteranLevel ?? aircraft?.veteranLevel ?? VeteranLevel.None;
        const vxlExtraLightScalar = renderable?.extraLight?.x ?? null;
        TestToolSupport.setState('aircraft', {
            availableAircraft: this.listEl?.querySelectorAll('a').length ?? 0,
            selectedAircraft: this.currentAircraftType ?? null,
            rendered: Boolean(renderable?.get3DObject?.() ?? renderable),
            selectionLevelValue: selectionLevel ?? null,
            selectionLevel: TestToolSupport.enumLabel(SelectionLevel, selectionLevel),
            selectionLevelOptions: TestToolSupport.enumOptions(SelectionLevel, [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected]),
            veteranLevelValue: aircraft ? veteranLevel : null,
            veteranLevel: aircraft ? TestToolSupport.enumLabel(VeteranLevel, veteranLevel) : null,
            veteranLevelOptions: TestToolSupport.enumOptions(VeteranLevel, [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite]),
            yaw: aircraft?.yaw ?? null,
            pitch: aircraft?.pitch ?? null,
            roll: aircraft?.roll ?? null,
            tileElevation: aircraft?.position?.tileElevation ?? null,
            moveState: aircraft?.moveTrait?.moveState ?? null,
            isMoving: aircraft?.moveTrait?.moveState === MoveState.Moving,
            zoneValue: aircraft?.zone ?? null,
            zone: TestToolSupport.enumLabel(ZoneType, aircraft?.zone),
            warpedOut: Boolean(aircraft?.warpedOutTrait?.isActive?.()),
            ownerColor: aircraft?.owner?.color?.asHexString?.() ?? null,
            vxlExtraLightScalar,
        });
    }
    static buildBrowser(aircraftRules: Map<string, any>): void {
        const list = (this.listEl = document.createElement("div"));
        list.style.position = "absolute";
        list.style.right = "0";
        list.style.top = "0";
        list.style.height = "600px";
        list.style.width = "200px";
        list.style.overflowY = "auto";
        list.style.padding = "5px";
        list.style.background = "rgba(255, 255, 255, 0.5)";
        list.style.border = "1px black solid";
        list.appendChild(document.createTextNode("Aircraft types:"));
        const types = [...aircraftRules.keys()]
            .filter((name) => this.art.hasObject(name, ObjectType.Aircraft))
            .sort();
        types.forEach((name) => {
            const link = document.createElement("a");
            link.dataset.aircraftType = name;
            link.style.display = "block";
            link.textContent = name;
            link.setAttribute("href", "javascript:;");
            link.addEventListener("click", () => {
                console.log("Selected aircraft", name);
                this.selectAircraft(name);
            });
            list.appendChild(link);
        });
        this.hostElement?.appendChild(list);
        TestToolSupport.applyPanelTheme(list);
        this.syncState();
        setTimeout(() => {
            if (types.length)
                this.selectAircraft(types[0]);
        }, 50);
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
        this.renderer.dispose();
        this.uiAnimationLoop.destroy();
        this.listEl?.remove();
        if (this.controlsEl) {
            this.controlsEl.remove();
            this.controlsEl = undefined;
        }
        this.currentAircraftType = undefined;
        this.disposables.dispose();
        TestToolSupport.clearState('aircraft');
        try {
            if ((PipOverlay as any)?.clearCaches) {
                PipOverlay.clearCaches();
            }
            if ((TextureUtils as any)?.cache) {
                TextureUtils.cache.forEach((tex: any) => tex.dispose?.());
                TextureUtils.cache.clear();
            }
        }
        catch (err) {
            console.warn('[AircraftTester] Failed to clear caches during destroy:', err);
        }
    }
}
