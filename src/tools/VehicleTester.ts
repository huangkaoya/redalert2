import { Renderer } from "@/engine/gfx/Renderer";
import { Engine } from "@/engine/Engine";
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
import { rampHeights } from "@/game/theater/rampHeights";
import { ResourceType } from "@/engine/resourceConfigs";
import { TestToolSupport, type TestToolRuntimeContext } from "@/tools/TestToolSupport";
declare const THREE: any;
export class VehicleTester {
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
    private static currentVehicle: any;
    private static listEl: HTMLDivElement;
    private static controlsEl: HTMLDivElement | undefined;
    private static hostElement?: HTMLElement;
    private static vxlGeometryPool: VxlGeometryPool;
    private static fixedDirection: number | undefined;
    private static animateTimer: number | undefined;
    private static currentVehicleType?: string;
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
        this.buildBrowser(rules["vehicleRules"] as Map<string, any>);
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
        mesh.position.y = 1;
        this.worldScene.scene.add(mesh);
    }
    static selectVehicle(vehicleType: string): void {
        if (this.currentVehicle && !this.currentVehicle.isDisposed) {
            this.world.removeObject(this.currentVehicle);
            this.currentVehicle.dispose();
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
        const vehicle = (this.currentVehicle = new ObjectFactory(tileCollection, tileOccupation, bridges, new BoxedVar(1)).create(ObjectType.Vehicle, vehicleType, this.rules as any, this.art as any));
        this.currentVehicleType = vehicleType;
        vehicle.owner = player;
        vehicle.position.tile = this.tile;
        const world = (this.world = new World());
        const renderableManager = new RenderableManager(world, this.worldScene, this.worldScene.camera, renderableFactory);
        renderableManager.init();
        this.disposables.add(renderableManager);
        world.spawnObject(vehicle);
        const renderable = (this.currentRenderable = renderableManager.getRenderableByGameObject(vehicle));
        renderable.selectionModel.setSelectionLevel(SelectionLevel.Selected);
        renderable.selectionModel.setControlGroupNumber(3);
        this.buildControls();
        this.startAutoAnimate();
        this.syncState();
    }
    private static startAutoAnimate(): void {
        if (this.animateTimer) {
            clearTimeout(this.animateTimer);
        }
        const step = () => {
            if (!this.currentVehicle)
                return;
            this.currentVehicle.direction = this.fixedDirection ?? ((this.currentVehicle.direction + 1) % 360);
            if (this.currentVehicle.turretTrait) {
                this.currentVehicle.turretTrait.facing = this.fixedDirection ?? ((this.currentVehicle.turretTrait.facing + 2) % 360);
            }
            this.animateTimer = window.setTimeout(step, 50);
        };
        this.animateTimer = window.setTimeout(step, 50);
    }
    static buildControls(): void {
        if (this.controlsEl) {
            this.controlsEl.remove();
        }
        const controls = (this.controlsEl = document.createElement("div"));
        controls.dataset.testid = "vehicle-controls";
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
        colorSelect.dataset.testid = "vehicle-color";
        colorSelect.style.display = "block";
        colorSelect.addEventListener("change", () => {
            this.currentVehicle.owner.color = colorMap.get(colorSelect.value);
            this.syncState();
        });
        controls.appendChild(colorSelect);
        colorMap.forEach((color, name) => {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = name;
            option.selected = color.asHex() === this.currentVehicle.owner.color.asHex();
            colorSelect.appendChild(option);
        });
        controls.appendChild(document.createTextNode("Selection level:"));
        const selDiv = document.createElement("div");
        controls.appendChild(selDiv);
        [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected].forEach((level) => {
            const btn = document.createElement("button");
            btn.innerHTML = SelectionLevel[level];
            btn.dataset.testid = `vehicle-selection-${SelectionLevel[level].toLowerCase()}`;
            btn.addEventListener("click", () => {
                this.currentRenderable.selectionModel.setSelectionLevel(level);
                this.syncState();
            });
            selDiv.appendChild(btn);
        });
        controls.appendChild(document.createTextNode("Veteran level:"));
        const vetDiv = document.createElement("div");
        controls.appendChild(vetDiv);
        if (this.currentVehicle.veteranTrait) {
            [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite].forEach((lvl) => {
                const btn = document.createElement("button");
                btn.innerHTML = VeteranLevel[lvl];
                btn.dataset.testid = `vehicle-veteran-${VeteranLevel[lvl].toLowerCase()}`;
                btn.addEventListener("click", () => {
                    this.currentVehicle.veteranTrait.veteranLevel = lvl;
                    this.syncState();
                });
                vetDiv.appendChild(btn);
            });
        }
        controls.appendChild(document.createTextNode("Ramp type:"));
        const rampSelect = document.createElement("select");
        rampSelect.dataset.testid = "vehicle-ramp";
        rampSelect.style.display = "block";
        rampSelect.addEventListener("change", () => {
            this.tile.rampType = Number(rampSelect.value);
            this.currentVehicle.tilterTrait?.onTileChange?.(this.currentVehicle);
            this.syncState();
        });
        for (let i = 0; i < rampHeights.length; i++) {
            const opt = document.createElement("option");
            opt.innerHTML = String(i);
            opt.value = String(i);
            rampSelect.appendChild(opt);
        }
        controls.appendChild(rampSelect);
        controls.appendChild(document.createTextNode("Turret #:"));
        const turretSelect = document.createElement("select");
        turretSelect.dataset.testid = "vehicle-turret";
        turretSelect.style.display = "block";
        turretSelect.disabled = !this.currentVehicle.rules.turret;
        turretSelect.addEventListener("change", () => {
            this.currentVehicle.turretNo = Number(turretSelect.value);
            this.syncState();
        });
        for (let t = 0; t < (this.currentVehicle.rules.turretCount || 0); t++) {
            const opt = document.createElement("option");
            opt.innerHTML = String(t);
            opt.value = String(t);
            turretSelect.appendChild(opt);
        }
        controls.appendChild(turretSelect);
        controls.appendChild(document.createTextNode("isMoving:"));
        const moving = document.createElement("input");
        moving.dataset.testid = "vehicle-moving";
        moving.type = "checkbox";
        moving.style.display = "block";
        moving.addEventListener("change", (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            this.currentVehicle.moveTrait.moveState = checked ? MoveState.Moving : MoveState.Idle;
            if (this.currentVehicle.rules.consideredAircraft && checked) {
                this.currentVehicle.zone = ZoneType.Air;
            }
            else {
                this.currentVehicle.zone = this.currentVehicle.rules.naval ? ZoneType.Water : ZoneType.Ground;
            }
            this.syncState();
        });
        controls.appendChild(moving);
        controls.appendChild(document.createTextNode("isFiring:"));
        const firing = document.createElement("input");
        firing.dataset.testid = "vehicle-firing";
        firing.type = "checkbox";
        firing.style.display = "block";
        firing.addEventListener("change", (e) => {
            this.currentVehicle.isFiring = (e.target as HTMLInputElement).checked;
            this.syncState();
        });
        controls.appendChild(firing);
        controls.appendChild(document.createTextNode("isRocking:"));
        const rocking = document.createElement("input");
        rocking.dataset.testid = "vehicle-rocking";
        rocking.type = "checkbox";
        rocking.style.display = "block";
        rocking.addEventListener("change", (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            if (checked)
                this.currentVehicle.applyRocking(360 * Math.random(), 1);
            else
                this.currentVehicle.rocking = undefined;
            this.syncState();
        });
        controls.appendChild(rocking);
        if (this.currentVehicle.airSpawnTrait) {
            controls.appendChild(document.createTextNode("hasSpawns:"));
            const hasSpawns = document.createElement("input");
            hasSpawns.dataset.testid = "vehicle-has-spawns";
            hasSpawns.type = "checkbox";
            hasSpawns.style.display = "block";
            hasSpawns.checked = !!this.currentVehicle.airSpawnTrait.availableSpawns;
            hasSpawns.addEventListener("change", (e) => {
                const v = (e.target as HTMLInputElement).checked ? 1 : 0;
                this.currentVehicle.airSpawnTrait.debugSetStorage(null, v);
                this.syncState();
            });
            controls.appendChild(hasSpawns);
        }
        controls.appendChild(document.createTextNode("Warped out:"));
        const warped = document.createElement("input");
        warped.dataset.testid = "vehicle-warped";
        warped.type = "checkbox";
        warped.style.display = "block";
        warped.addEventListener("change", (e) => {
            this.currentVehicle.warpedOutTrait?.debugSetActive((e.target as HTMLInputElement).checked);
            this.syncState();
        });
        controls.appendChild(warped);
        controls.appendChild(document.createTextNode("Direction:"));
        const dirWrap = document.createElement("div");
        controls.appendChild(dirWrap);
        const dir = document.createElement("input");
        dir.dataset.testid = "vehicle-direction";
        dir.type = "range";
        dir.min = "-180";
        dir.max = "180";
        dir.value = "0";
        dir.disabled = this.fixedDirection === undefined ? true : false;
        dir.style.verticalAlign = "middle";
        dir.addEventListener("input", () => {
            this.fixedDirection = Number(dir.value);
            this.syncState();
        });
        dirWrap.appendChild(dir);
        const reset = document.createElement("button");
        reset.dataset.testid = "vehicle-direction-reset";
        reset.innerHTML = "Reset";
        reset.disabled = this.fixedDirection === undefined;
        reset.style.verticalAlign = "middle";
        reset.addEventListener("click", () => {
            if (this.fixedDirection !== undefined) {
                this.fixedDirection = 0;
                dir.value = "0";
                this.syncState();
            }
        });
        dirWrap.appendChild(reset);
        const autoRotate = document.createElement("input");
        autoRotate.dataset.testid = "vehicle-auto-rotate";
        autoRotate.type = "checkbox";
        autoRotate.checked = this.fixedDirection === undefined;
        autoRotate.addEventListener("change", (e) => {
            this.fixedDirection = (e.target as HTMLInputElement).checked ? undefined : 0;
            const disabled = this.fixedDirection === undefined;
            dir.disabled = disabled;
            reset.disabled = disabled;
            dir.value = "0";
            this.syncState();
        });
        controls.appendChild(autoRotate);
        const autoLabel = document.createElement("label");
        autoLabel.innerHTML = "Auto rotate";
        controls.appendChild(autoLabel);
        const destroy = document.createElement("button");
        destroy.dataset.testid = "vehicle-destroy";
        destroy.style.display = "block";
        destroy.style.color = "red";
        destroy.innerHTML = "DESTROY";
        destroy.addEventListener("click", async () => {
            this.currentVehicle.isDestroyed = true;
            this.world.removeObject(this.currentVehicle);
            this.currentVehicle.dispose();
            this.currentVehicle = undefined;
            this.currentVehicleType = undefined;
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
        const vehicle = this.currentVehicle;
        const renderable = this.currentRenderable;
        const selectionLevel = renderable?.selectionModel?.getSelectionLevel?.();
        const veteranLevel = vehicle?.veteranTrait?.veteranLevel ?? vehicle?.veteranLevel ?? VeteranLevel.None;
        const controlGroupTextureUuid = renderable?.pipOverlay?.controlGroupSprite?.material?.map?.uuid
            ?? renderable?.pipOverlay?.controlGroupSprite?.material?.uniforms?.map?.value?.uuid
            ?? null;
        const controlGroupColorHex = renderable?.pipOverlay?.lastOwnerColorHex !== undefined
            ? `#${Number(renderable.pipOverlay.lastOwnerColorHex).toString(16).padStart(6, "0")}`
            : null;
        const vxlExtraLightScalar = renderable?.vxlExtraLight?.x ?? null;
        TestToolSupport.setState('vehicle', {
            availableVehicles: this.listEl?.querySelectorAll('a').length ?? 0,
            selectedVehicle: this.currentVehicleType ?? null,
            rendered: Boolean(renderable?.get3DObject?.() ?? renderable),
            selectionLevelValue: selectionLevel ?? null,
            selectionLevel: TestToolSupport.enumLabel(SelectionLevel, selectionLevel),
            selectionLevelOptions: TestToolSupport.enumOptions(SelectionLevel, [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected]),
            veteranLevelValue: vehicle ? veteranLevel : null,
            veteranLevel: vehicle ? TestToolSupport.enumLabel(VeteranLevel, veteranLevel) : null,
            veteranLevelOptions: TestToolSupport.enumOptions(VeteranLevel, [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite]),
            rampType: vehicle ? this.tile.rampType : null,
            rampOptions: rampHeights.map((_, index) => String(index)),
            turretNo: vehicle ? this.currentVehicle.turretNo ?? 0 : null,
            turretOptions: vehicle ? Array.from({ length: this.currentVehicle.rules.turretCount || 0 }, (_, index) => String(index)) : [],
            hasTurret: Boolean(vehicle?.turretTrait),
            moveState: vehicle?.moveTrait?.moveState ?? null,
            isMoving: vehicle?.moveTrait?.moveState === MoveState.Moving,
            zoneValue: vehicle?.zone ?? null,
            zone: TestToolSupport.enumLabel(ZoneType, vehicle?.zone),
            isFiring: Boolean(vehicle?.isFiring),
            isRocking: Boolean(vehicle?.rocking),
            hasSpawns: Boolean(vehicle?.airSpawnTrait),
            availableSpawns: vehicle?.airSpawnTrait?.availableSpawns ?? null,
            warpedOut: Boolean(vehicle?.warpedOutTrait?.isActive?.()),
            direction: vehicle?.direction ?? null,
            fixedDirection: this.fixedDirection ?? null,
            autoRotate: this.fixedDirection === undefined,
            ownerColor: vehicle?.owner?.color?.asHexString?.() ?? null,
            controlGroupTextureUuid,
            controlGroupColorHex,
            vxlExtraLightScalar,
        });
    }
    static buildBrowser(vehicleRules: Map<string, any>): void {
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
        list.appendChild(document.createTextNode("Vehicle types:"));
        const types = [...vehicleRules.keys()]
            .filter((name) => this.art.hasObject(name, ObjectType.Vehicle))
            .sort();
        types.forEach((name) => {
            const link = document.createElement("a");
            link.dataset.vehicleType = name;
            link.style.display = "block";
            link.textContent = name;
            link.setAttribute("href", "javascript:;");
            link.addEventListener("click", () => {
                console.log("Selected vehicle", name);
                this.selectVehicle(name);
            });
            list.appendChild(link);
        });
        this.hostElement?.appendChild(list);
        TestToolSupport.applyPanelTheme(list);
        this.syncState();
        setTimeout(() => {
            if (types.length) {
                this.selectVehicle(types[0]);
            }
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
        this.renderer?.dispose?.();
        this.uiAnimationLoop?.destroy?.();
        this.listEl?.remove?.();
        if (this.controlsEl) {
            this.controlsEl.remove();
            this.controlsEl = undefined;
        }
        if (this.animateTimer) {
            clearTimeout(this.animateTimer);
            this.animateTimer = undefined;
        }
        this.currentVehicleType = undefined;
        this.disposables.dispose();
        TestToolSupport.clearState('vehicle');
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
            console.warn('[VehicleTester] Failed to clear caches during destroy:', err);
        }
    }
    private static tile: {
        rx: number;
        ry: number;
        z: number;
        rampType: number;
    } = { rx: 1, ry: 1, z: 0, rampType: 0 };
}
