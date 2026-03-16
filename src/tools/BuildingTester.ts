import { Renderer } from "@/engine/gfx/Renderer";
import { Engine } from "@/engine/Engine";
import { IsoCoords } from "@/engine/IsoCoords";
import { TheaterType } from "@/engine/TheaterType";
import { Player } from "@/game/Player";
import { DamageType } from "@/engine/renderable/entity/building/DamageType";
import { AnimationType } from "@/engine/renderable/entity/building/AnimationType";
import { WorldScene } from "@/engine/renderable/WorldScene";
import { Rules } from "@/game/rules/Rules";
import { MapGrid } from "@/engine/renderable/entity/map/MapGrid";
import { BoxedVar } from "@/util/BoxedVar";
import { UiAnimationLoop } from "@/engine/UiAnimationLoop";
import { ImageFinder } from "@/engine/ImageFinder";
import { Art } from "@/game/art/Art";
import { RenderableFactory } from "@/engine/renderable/entity/RenderableFactory";
import { Color } from "@/util/Color";
import { SelectionLevel } from "@/game/gameobject/selection/SelectionLevel";
import { Alliances } from "@/game/Alliances";
import { PlayerList } from "@/game/PlayerList";
import { ObjectFactory } from "@/game/gameobject/ObjectFactory";
import { ObjectType } from "@/engine/type/ObjectType";
import { PointerEvents } from "@/gui/PointerEvents";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { UnitSelection } from "@/game/gameobject/selection/UnitSelection";
import { CameraZoomControls } from "@/tools/CameraZoomControls";
import { Infantry } from "@/game/gameobject/Infantry";
import { Lighting } from "@/engine/Lighting";
import { TileCollection } from "@/game/map/TileCollection";
import { TileOccupation } from "@/game/map/TileOccupation";
import { Bridges } from "@/game/map/Bridges";
import { Strings } from "@/data/Strings";
import { AutoRepairTrait } from "@/game/gameobject/trait/AutoRepairTrait";
import { MapBounds } from "@/game/map/MapBounds";
import { FlyerHelperMode } from "@/engine/renderable/entity/unit/FlyerHelperMode";
import { LightingDirector } from "@/engine/gfx/lighting/LightingDirector";
import { World } from "@/game/World";
import { RenderableManager } from "@/engine/RenderableManager";
import { VxlBuilderFactory } from "@/engine/renderable/builder/VxlBuilderFactory";
import { VxlGeometryPool } from "@/engine/renderable/builder/vxlGeometry/VxlGeometryPool";
import { VxlGeometryCache } from "@/engine/gfx/geometry/VxlGeometryCache";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
import { CanvasMetrics } from "@/gui/CanvasMetrics";
import { getRandomInt } from "@/util/math";
import { PipOverlay } from "@/engine/renderable/entity/PipOverlay";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
declare const THREE: any;
interface BuildingRule {
    techLevel: number;
    constructionYard: boolean;
    selectable: boolean;
    maxNumberOccupants: number;
}
interface GameObject {
    owner: Player;
    position: {
        tile: {
            rx: number;
            ry: number;
            z: number;
            rampType: number;
        };
        setCenterOffset(offset: any): void;
    };
    getFoundationCenterOffset(): any;
    isDisposed: boolean;
    dispose(): void;
    isDestroyed: boolean;
    healthTrait: {
        health: number;
    };
    garrisonTrait: {
        units: Infantry[];
    } | null;
    rules: BuildingRule;
    traits: Map<any, any>;
    warpedOutTrait: {
        debugSetActive(active: boolean): void;
    };
}
interface Renderable {
    selectionModel: {
        setSelectionLevel(level: SelectionLevel): void;
        setControlGroupNumber(number: number): void;
    };
    setAnimation(type: AnimationType, time: number): void;
    endCurrentAnimation(): void;
    hasAnimation(type: AnimationType): boolean;
    setPowered(powered: boolean): void;
}
export class BuildingTester {
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
    private static vxlGeometryPool: VxlGeometryPool;
    private static currentRenderable: Renderable | null = null;
    private static currentBuilding: GameObject | null = null;
    private static world: World;
    private static animButtonsWrap: HTMLDivElement;
    private static occupiedButtonsWrap: HTMLDivElement;
    private static controlsElement: HTMLDivElement | undefined;
    private static listEl: HTMLDivElement;
    static async main(args: any[]): Promise<void> {
        const renderer = (this.renderer = new Renderer(800, 600));
        renderer.init(document.body);
        renderer.initStats(document.body);
        this.buildHomeButton();
        const worldScene = WorldScene.factory({ x: 0, y: 0, width: 800, height: 600 }, new BoxedVar(true), new BoxedVar(ShadowQuality.High));
        this.disposables.add(worldScene);
        (worldScene.scene.background as any) = new THREE.Color(12632256);
        IsoCoords.init({ x: 0, y: 0 });
        this.theater = await Engine.loadTheater(TheaterType.Snow);
        const rules = new Rules(Engine.getRules());
        this.buildBrowser(rules.buildingRules);
        this.rules = rules;
        console.log('current all rules', rules);
        this.art = new Art(rules, Engine.getArt());
        this.images = Engine.getImages();
        this.voxels = Engine.getVoxels();
        this.voxelAnims = Engine.getVoxelAnims();
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(canvasMetrics);
        const pointerEvents = new PointerEvents(renderer, { x: 0, y: 0 }, document, canvasMetrics);
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        this.disposables.add(cameraZoomControls, pointerEvents);
        cameraZoomControls.init();
        renderer.addScene(worldScene);
        const uiAnimationLoop = (this.uiAnimationLoop = new UiAnimationLoop(renderer));
        uiAnimationLoop.start();
        this.worldScene = worldScene;
        this.vxlGeometryPool = new VxlGeometryPool(new VxlGeometryCache());
        this.addGrid();
    }
    static addGrid(): void {
        const mapGrid = new MapGrid({ width: 10, height: 10 });
        const gridObject = mapGrid.get3DObject();
        const container = new THREE.Object3D();
        container.add(gridObject);
        this.worldScene.scene.add(container);
    }
    static selectBuilding(buildingType: string): void {
        if (this.currentRenderable && this.currentBuilding && !this.currentBuilding.isDisposed) {
            this.world.removeObject(this.currentBuilding);
            this.currentBuilding.dispose();
        }
        const buildingRule = this.rules.getBuilding(buildingType);
        const player = new Player("Player");
        this.disposables.add(player);
        player.color = buildingRule.techLevel !== -1 || buildingRule.constructionYard
            ? this.rules.getMultiplayerColors().get("DarkRed")
            : new Color(255, 255, 255);
        const playerList = new PlayerList();
        playerList.addPlayer(player);
        const alliances = new Alliances(playerList);
        const unitSelection = new UnitSelection();
        const lighting = new Lighting();
        this.disposables.add(lighting);
        const renderableFactory = new RenderableFactory(new BoxedVar(player), unitSelection, alliances, this.rules, this.art, undefined, new ImageFinder(this.images, this.theater), Engine.getPalettes(), this.voxels, this.voxelAnims, this.theater, this.worldScene.camera, lighting, new LightingDirector(lighting, this.renderer, new BoxedVar(1)), new BoxedVar(false), new BoxedVar(false), new BoxedVar(2), undefined, new Strings({ TXT_PRIMARY: "Primary" }), new BoxedVar(FlyerHelperMode.Selected), new BoxedVar(false), new VxlBuilderFactory(this.vxlGeometryPool, false, this.worldScene.camera), new Map());
        const tileCollection = new TileCollection([], null as any, this.rules.general, (min: number, max: number) => getRandomInt(min, max));
        const tileOccupation = new TileOccupation(tileCollection);
        const mapBounds = new MapBounds();
        const bridges = new Bridges(this.theater.tileSets, tileCollection, tileOccupation, mapBounds, this.rules);
        const building = (this.currentBuilding = new ObjectFactory(tileCollection, tileOccupation, bridges, new BoxedVar(1)).create(ObjectType.Building, buildingType, this.rules, this.art) as GameObject);
        building.owner = player;
        building.position.tile = { rx: 1, ry: 1, z: 0, rampType: 0 };
        building.position.setCenterOffset(building.getFoundationCenterOffset());
        const world = (this.world = new World());
        const renderableManager = new RenderableManager(world, this.worldScene, this.worldScene.camera, renderableFactory);
        renderableManager.init();
        this.disposables.add(renderableManager);
        world.spawnObject(building);
        const renderable = (this.currentRenderable = renderableManager.getRenderableByGameObject(building) as Renderable);
        renderable.selectionModel.setSelectionLevel(SelectionLevel.Selected);
        this.currentRenderable.selectionModel.setControlGroupNumber(3);
        setTimeout(() => {
            this.buildBuildingControls();
            this.createAnimButtons();
            this.createOccupiedButtons();
        }, 50);
    }
    static selectAnimation(animationType: AnimationType): void {
        if (this.currentRenderable) {
            this.currentRenderable.setAnimation(animationType, performance.now());
        }
    }
    static stopCurrentAnimation(): void {
        if (this.currentRenderable) {
            this.currentRenderable.endCurrentAnimation();
        }
    }
    static setDamageType(damageType: DamageType | null): void {
        if (!this.currentBuilding)
            return;
        this.currentBuilding.healthTrait.health = damageType
            ? 100 * (damageType === DamageType.CONDITION_YELLOW
                ? this.rules.audioVisual.conditionYellow
                : this.rules.audioVisual.conditionRed)
            : 100;
    }
    static setActiveState(active: boolean): void {
        if (this.currentRenderable) {
            this.currentRenderable.setPowered(active);
        }
    }
    static createAnimButtons(): void {
        const container = this.animButtonsWrap;
        container.innerHTML = "";
        const animationTypes = [
            AnimationType.IDLE,
            AnimationType.PRODUCTION,
            AnimationType.BUILDUP,
            AnimationType.UNBUILD,
            AnimationType.SUPER_CHARGE_START,
            AnimationType.SPECIAL_REPAIR_START,
            AnimationType.SPECIAL_SHOOT,
            AnimationType.SPECIAL_DOCKING,
            AnimationType.FACTORY_DEPLOYING,
            AnimationType.FACTORY_ROOF_DEPLOYING,
        ];
        for (const animType of animationTypes) {
            const button = document.createElement("button");
            button.innerHTML = AnimationType[animType];
            button.style.display = "block";
            button.addEventListener("click", () => this.selectAnimation(animType));
            if (!this.currentRenderable) {
                throw new Error("Must build anim buttons after a building is selected");
            }
            const hasAnimation = this.currentRenderable.hasAnimation(animType);
            button.disabled = !hasAnimation;
            button.style.opacity = hasAnimation ? "1" : ".5";
            container.appendChild(button);
        }
    }
    static createOccupiedButtons(): void {
        const container = this.occupiedButtonsWrap;
        container.innerHTML = "";
        const select = document.createElement("select");
        select.disabled = !this.currentBuilding?.garrisonTrait;
        select.style.display = "block";
        select.addEventListener("change", () => {
            if (this.currentBuilding?.garrisonTrait) {
                this.currentBuilding.garrisonTrait.units = new Array(Number(select.value))
                    .fill(0)
                    .map(() => new Infantry("dummy", this.rules.getObject("E1", ObjectType.Infantry), null));
            }
        });
        const maxOccupants = this.currentBuilding?.rules.maxNumberOccupants || 0;
        for (let i = 0; i < maxOccupants + 1; i++) {
            const option = document.createElement("option");
            option.innerHTML = String(i);
            option.value = String(i);
            option.selected = i === 0;
            select.appendChild(option);
        }
        container.appendChild(select);
    }
    static buildBuildingControls(): void {
        if (this.controlsElement) {
            document.body.removeChild(this.controlsElement);
        }
        const controls = (this.controlsElement = document.createElement("div"));
        controls.style.position = "absolute";
        controls.style.left = "0";
        controls.style.top = "0";
        controls.style.width = "220px";
        controls.style.padding = "5px";
        controls.style.background = "rgba(255, 255, 255, 0.5)";
        controls.style.border = "1px black solid";
        controls.appendChild(document.createTextNode("Remap color:"));
        const colorMap = new Map(this.rules.getMultiplayerColors());
        colorMap.set("None", new Color(255, 255, 255));
        const colorSelect = document.createElement("select");
        colorSelect.style.display = "block";
        colorSelect.addEventListener("change", () => {
            if (this.currentBuilding) {
                this.currentBuilding.owner.color = colorMap.get(colorSelect.value) as Color;
            }
        });
        controls.appendChild(colorSelect);
        colorMap.forEach((color, name) => {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = name;
            option.selected = this.currentBuilding ?
                color.asHex() === this.currentBuilding.owner.color.asHex() : false;
            colorSelect.appendChild(option);
        });
        controls.appendChild(document.createTextNode("Selection level:"));
        const selectionDiv = document.createElement("div");
        controls.appendChild(selectionDiv);
        [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected].forEach((level) => {
            console.log('current level', level, this.currentBuilding.rules);
            const button = document.createElement("button");
            button.innerHTML = SelectionLevel[level];
            button.disabled = level === SelectionLevel.Selected &&
                (!this.currentBuilding || !this.currentBuilding.rules.selectable);
            button.addEventListener("click", () => {
                if (this.currentRenderable) {
                    this.currentRenderable.selectionModel.setSelectionLevel(level);
                }
            });
            selectionDiv.appendChild(button);
        });
        controls.appendChild(document.createTextNode("Animation type:"));
        this.animButtonsWrap = document.createElement("div");
        controls.appendChild(this.animButtonsWrap);
        const stopButton = document.createElement("button");
        stopButton.innerHTML = "Stop current";
        stopButton.style.display = "block";
        stopButton.addEventListener("click", () => this.stopCurrentAnimation());
        controls.appendChild(stopButton);
        controls.appendChild(document.createTextNode("Occupants:"));
        this.occupiedButtonsWrap = document.createElement("div");
        controls.appendChild(this.occupiedButtonsWrap);
        controls.appendChild(document.createTextNode("Damage type:"));
        const normalButton = document.createElement("button");
        normalButton.innerHTML = "NORMAL";
        normalButton.style.display = "block";
        normalButton.addEventListener("click", () => this.setDamageType(DamageType.NORMAL));
        controls.appendChild(normalButton);
        const yellowButton = document.createElement("button");
        yellowButton.innerHTML = "YELLOW";
        yellowButton.style.display = "block";
        yellowButton.addEventListener("click", () => this.setDamageType(DamageType.CONDITION_YELLOW));
        controls.appendChild(yellowButton);
        const redButton = document.createElement("button");
        redButton.innerHTML = "RED";
        redButton.style.display = "block";
        redButton.addEventListener("click", () => this.setDamageType(DamageType.CONDITION_RED));
        controls.appendChild(redButton);
        const destroyButton = document.createElement("button");
        destroyButton.innerHTML = "DESTROYED";
        destroyButton.style.display = "block";
        destroyButton.addEventListener("click", async () => {
            if (this.currentBuilding) {
                this.currentBuilding.isDestroyed = true;
                this.currentBuilding.healthTrait.health = 0;
                this.world.removeObject(this.currentBuilding);
                this.currentBuilding.dispose();
                if (this.controlsElement) {
                    document.body.removeChild(this.controlsElement);
                    this.controlsElement = undefined;
                }
            }
        });
        controls.appendChild(destroyButton);
        const repairButton = document.createElement("button");
        repairButton.innerHTML = "Toggle repair";
        repairButton.style.display = "block";
        repairButton.addEventListener("click", () => {
            if (this.currentBuilding) {
                const autoRepairTrait = this.currentBuilding.traits.get(AutoRepairTrait);
                autoRepairTrait.setDisabled(!autoRepairTrait.isDisabled());
            }
        });
        controls.appendChild(repairButton);
        controls.appendChild(document.createTextNode("Powered state:"));
        const inactiveButton = document.createElement("button");
        inactiveButton.innerHTML = "INACTIVE";
        inactiveButton.style.display = "block";
        inactiveButton.addEventListener("click", () => this.setActiveState(false));
        controls.appendChild(inactiveButton);
        const activeButton = document.createElement("button");
        activeButton.innerHTML = "ACTIVE";
        activeButton.style.display = "block";
        activeButton.addEventListener("click", () => this.setActiveState(true));
        controls.appendChild(activeButton);
        controls.appendChild(document.createTextNode("Warped out:"));
        const warpedCheckbox = document.createElement("input");
        warpedCheckbox.type = "checkbox";
        warpedCheckbox.style.display = "block";
        warpedCheckbox.addEventListener("change", (event) => {
            if (this.currentBuilding && event.target) {
                const target = event.target as HTMLInputElement;
                this.currentBuilding.warpedOutTrait.debugSetActive(target.checked);
            }
        });
        controls.appendChild(warpedCheckbox);
        document.body.appendChild(controls);
    }
    static buildBrowser(buildingRules: Map<string, any>): void {
        const browser = (this.listEl = document.createElement("div"));
        browser.style.position = "absolute";
        browser.style.right = "0";
        browser.style.top = "0";
        browser.style.height = "600px";
        browser.style.width = "200px";
        browser.style.overflowY = "auto";
        browser.style.padding = "5px";
        browser.style.background = "rgba(255, 255, 255, 0.5)";
        browser.style.border = "1px black solid";
        browser.appendChild(document.createTextNode("Building types:"));
        const buildingTypes: string[] = [];
        buildingRules.forEach((rule, type) => {
            const excludedTypes = ["AMMOCRAT", "GADUMY", "GAGREEN", "CAARMR"];
            if (!excludedTypes.includes(type) &&
                !/^CASIN/.test(type) &&
                !/^CITY/.test(type)) {
                buildingTypes.push(type);
            }
        });
        buildingTypes.sort();
        buildingTypes.forEach((type) => {
            const link = document.createElement("a");
            link.style.display = "block";
            link.textContent = type;
            link.setAttribute("href", "javascript:;");
            link.addEventListener("click", () => {
                console.log("Selected building", type);
                this.selectBuilding(type);
            });
            browser.appendChild(link);
        });
        document.body.appendChild(browser);
        setTimeout(() => {
            this.selectBuilding(buildingTypes[0]);
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
        this.listEl.remove();
        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = undefined;
        }
        this.disposables.dispose();
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
            console.warn('[BuildingTester] Failed to clear caches during destroy:', err);
        }
    }
}
