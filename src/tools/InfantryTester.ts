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
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { SpeedType } from "@/game/type/SpeedType";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { InfDeathType } from "@/game/gameobject/infantry/InfDeathType";
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
import { Strings } from "@/data/Strings";
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
import { PipOverlay } from "@/engine/renderable/entity/PipOverlay";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { ResourceType } from "@/engine/resourceConfigs";
import { Color } from "@/util/Color";
import { TestToolSupport, type TestToolRuntimeContext } from "@/tools/TestToolSupport";
declare const THREE: any;
export class InfantryTester {
    private static disposables = new CompositeDisposable();
    private static renderer: Renderer;
    private static theater: any;
    private static rules: Rules;
    private static art: Art;
    private static images: any;
    private static uiAnimationLoop: UiAnimationLoop;
    private static worldScene: WorldScene;
    private static world: World;
    private static currentRenderable: any;
    private static currentInfantry: any;
    private static listEl: HTMLDivElement;
    private static controlsEl: HTMLDivElement | undefined;
    private static hostElement?: HTMLElement;
    private static vxlBuilderFactory: VxlBuilderFactory;
    private static autoRotate: boolean = false;
    private static currentInfantryType?: string;
    private static currentInfantryColor?: Color;
    static async main(_args: any, context: TestToolRuntimeContext = {}): Promise<void> {
        await TestToolSupport.ensureTheater(TheaterType.Snow, context.cdnResourceLoader, [ResourceType.Anims]);
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
        this.theater = await Engine.loadTheater(TheaterType.Snow);
        const rules = new Rules(Engine.getRules());
        this.rules = rules;
        this.art = new Art(rules as any, Engine.getArt(), undefined as any, console);
        this.images = Engine.getImages();
        this.buildBrowser(rules["infantryRules"] as Map<string, any>);
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(() => canvasMetrics.dispose());
        const pointerEvents = new PointerEvents(renderer as any, { x: 0, y: 0 }, document, canvasMetrics as any);
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        this.disposables.add(cameraZoomControls, pointerEvents);
        cameraZoomControls.init();
        renderer.addScene(worldScene);
        const uiAnimationLoop = (this.uiAnimationLoop = new UiAnimationLoop(renderer));
        uiAnimationLoop.start();
        this.worldScene = worldScene;
        this.vxlBuilderFactory = new VxlBuilderFactory(new VxlGeometryPool(new VxlGeometryCache(null, null)), false, worldScene.camera);
        this.addGrid();
        this.syncState();
    }
    static addGrid(): void {
        const mapGrid = new MapGrid({ width: 10, height: 10 });
        const gridObject = mapGrid.get3DObject();
        const container = new THREE.Object3D();
        container.add(gridObject);
        this.worldScene.scene.add(container);
    }
    static selectInfantry(infantryType: string): void {
        if (this.currentInfantry && !this.currentInfantry.isDisposed) {
            this.world.removeObject(this.currentInfantry);
            this.currentInfantry.dispose();
        }
        const player = new Player("Player");
        this.disposables.add(player);
        const playerList = new PlayerList();
        playerList.addPlayer(player);
        const alliances = new Alliances(playerList);
        const unitSelection = new UnitSelection();
        const lighting = new Lighting();
        this.disposables.add(lighting);
        const renderableFactory = new RenderableFactory(new BoxedVar(player) as any, unitSelection as any, alliances as any, this.rules as any, this.art as any, undefined as any, new ImageFinder(this.images, this.theater) as any, Engine.getPalettes() as any, Engine.getVoxels() as any, Engine.getVoxelAnims() as any, this.theater as any, this.worldScene.camera as any, new Lighting(), new LightingDirector(new Lighting().mapLighting as any, this.renderer as any, new BoxedVar(1) as any) as any, new BoxedVar(false) as any, new BoxedVar(false) as any, new BoxedVar(2) as any, null as any, new Strings({ TXT_PRIMARY: "Primary" }) as any, new BoxedVar(FlyerHelperMode.Selected) as any, new BoxedVar(false) as any, this.vxlBuilderFactory as any, new Map() as any);
        const tileCollection = new TileCollection([
            { rx: 0, ry: 0, dx: 0, dy: 0, z: 0, tileNum: 0, subTile: 0 },
            { rx: 1, ry: 0, dx: 1, dy: 0, z: 0, tileNum: 0, subTile: 0 },
            { rx: 0, ry: 1, dx: 0, dy: 1, z: 0, tileNum: 0, subTile: 0 },
            { rx: 1, ry: 1, dx: 1, dy: 1, z: 0, tileNum: 0, subTile: 0 },
        ] as any, this.theater.tileSets as any, this.rules.general as any, (_min: number, _max: number) => 0);
        const tileOccupation = new TileOccupation(tileCollection);
        const mapBounds = new MapBounds();
        const bridges = new Bridges(this.theater.tileSets, tileCollection, tileOccupation, mapBounds, this.rules);
        const infantry = (this.currentInfantry = new ObjectFactory(tileCollection, tileOccupation, bridges, new BoxedVar(1)).create(ObjectType.Infantry, infantryType, this.rules as any, this.art as any));
        this.currentInfantryType = infantryType;
        const selectedColor = this.currentInfantryColor?.clone()
            ?? this.rules.getMultiplayerColors().get("DarkRed")?.clone()
            ?? new Color(255, 0, 0);
        player.color = selectedColor;
        this.currentInfantryColor = selectedColor.clone();
        infantry.owner = player;
        infantry.position.tile = { rx: 1, ry: 1, z: 0, rampType: 0 };
        const world = (this.world = new World());
        const renderableManager = new RenderableManager(world, this.worldScene, this.worldScene.camera, renderableFactory);
        renderableManager.init();
        this.disposables.add(renderableManager);
        world.spawnObject(infantry);
        const renderable = (this.currentRenderable = renderableManager.getRenderableByGameObject(infantry));
        renderable.selectionModel.setSelectionLevel(SelectionLevel.Selected);
        renderable.selectionModel.setControlGroupNumber(3);
        this.buildControls();
        this.syncState();
    }
    static buildControls(): void {
        if (this.controlsEl) {
            this.controlsEl.remove();
        }
        const controls = (this.controlsEl = document.createElement("div"));
        controls.dataset.testid = "infantry-controls";
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
        colorSelect.dataset.testid = "infantry-color";
        colorSelect.style.display = "block";
        colorSelect.addEventListener("change", () => {
            const nextColor = colorMap.get(colorSelect.value);
            if (nextColor && this.currentInfantryType) {
                this.currentInfantryColor = nextColor.clone();
                this.selectInfantry(this.currentInfantryType);
            }
        });
        controls.appendChild(colorSelect);
        colorMap.forEach((color, name) => {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = name;
            option.selected = color.asHex() === this.currentInfantry.owner.color.asHex();
            colorSelect.appendChild(option);
        });
        controls.appendChild(document.createTextNode("Selection level:"));
        const selDiv = document.createElement("div");
        controls.appendChild(selDiv);
        [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected].forEach((level) => {
            const btn = document.createElement("button");
            btn.innerHTML = SelectionLevel[level];
            btn.dataset.testid = `infantry-selection-${SelectionLevel[level].toLowerCase()}`;
            btn.addEventListener("click", () => {
                this.currentRenderable.selectionModel.setSelectionLevel(level);
                this.syncState();
            });
            selDiv.appendChild(btn);
        });
        controls.appendChild(document.createTextNode("Veteran level:"));
        const vetDiv = document.createElement("div");
        controls.appendChild(vetDiv);
        [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite].forEach((lvl) => {
            const btn = document.createElement("button");
            btn.innerHTML = VeteranLevel[lvl];
            btn.dataset.testid = `infantry-veteran-${VeteranLevel[lvl].toLowerCase()}`;
            btn.addEventListener("click", () => {
                if (this.currentInfantry.veteranTrait) {
                    this.currentInfantry.veteranTrait.veteranLevel = lvl;
                }
                this.syncState();
            });
            vetDiv.appendChild(btn);
        });
        controls.appendChild(document.createTextNode("SubCell:"));
        const subCell = document.createElement("select");
        subCell.dataset.testid = "infantry-subcell";
        subCell.style.display = "block";
        subCell.addEventListener("change", () => {
            this.currentInfantry.position.subCell = Number(subCell.value);
            this.syncState();
        });
        controls.appendChild(subCell);
        for (let i = 0; i < 5; i++) {
            const opt = document.createElement("option");
            opt.innerHTML = String(i);
            opt.value = String(i);
            subCell.appendChild(opt);
        }
        controls.appendChild(document.createTextNode("Zone:"));
        this.createZoneSelect(controls);
        controls.appendChild(document.createTextNode("Stance:"));
        this.createStanceSelect(controls);
        controls.appendChild(document.createTextNode("isMoving:"));
        const moving = document.createElement("input");
        moving.dataset.testid = "infantry-moving";
        moving.type = "checkbox";
        moving.style.display = "block";
        moving.addEventListener("change", (e) => {
            this.currentInfantry.moveTrait.moveState = (e.target as HTMLInputElement).checked
                ? MoveState.Moving
                : MoveState.Idle;
            this.syncState();
        });
        controls.appendChild(moving);
        controls.appendChild(document.createTextNode("isFiring:"));
        const firing = document.createElement("input");
        firing.dataset.testid = "infantry-firing";
        firing.type = "checkbox";
        firing.disabled = !this.currentInfantry.rules.primary;
        firing.style.display = "block";
        firing.addEventListener("change", (e) => {
            this.currentInfantry.isFiring = (e.target as HTMLInputElement).checked;
            this.syncState();
        });
        controls.appendChild(firing);
        controls.appendChild(document.createTextNode("isPanicked:"));
        const panic = document.createElement("input");
        panic.dataset.testid = "infantry-panic";
        panic.type = "checkbox";
        panic.disabled = !this.currentInfantry.rules.fraidycat;
        panic.style.display = "block";
        panic.addEventListener("change", (e) => {
            this.currentInfantry.isPanicked = (e.target as HTMLInputElement).checked;
            this.syncState();
        });
        controls.appendChild(panic);
        controls.appendChild(document.createTextNode("Warped out:"));
        const warped = document.createElement("input");
        warped.dataset.testid = "infantry-warped";
        warped.type = "checkbox";
        warped.style.display = "block";
        warped.addEventListener("change", (e) => {
            this.currentInfantry.warpedOutTrait.debugSetActive((e.target as HTMLInputElement).checked);
            this.syncState();
        });
        controls.appendChild(warped);
        this.createDeathSelect(controls);
        controls.appendChild(document.createElement("hr"));
        controls.appendChild(document.createTextNode("Facing (0-7):"));
        const facingSelect = document.createElement("select");
        facingSelect.dataset.testid = "infantry-facing";
        facingSelect.style.display = "block";
        const facingLabels = ["0 上", "1 左上", "2 左", "3 左下", "4 下", "5 右下", "6 右", "7 右上"];
        for (let i = 0; i < 8; i++) {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.innerHTML = facingLabels[i];
            facingSelect.appendChild(opt);
        }
        facingSelect.addEventListener("change", () => {
            const n = Number(facingSelect.value) % 8;
            const dir = (45 + (360 * n) / 8) % 360;
            this.currentInfantry.direction = dir;
            this.syncState();
        });
        controls.appendChild(facingSelect);
        controls.appendChild(document.createTextNode("Direction (0-359):"));
        const dirWrap = document.createElement("div");
        const dirInput = document.createElement("input");
        dirInput.dataset.testid = "infantry-direction-input";
        dirInput.type = "number";
        dirInput.min = "0";
        dirInput.max = "359";
        dirInput.style.width = "80px";
        dirInput.value = String(this.currentInfantry?.direction ?? 0);
        const dirBtn = document.createElement("button");
        dirBtn.dataset.testid = "infantry-direction-apply";
        dirBtn.innerHTML = "Apply";
        dirBtn.addEventListener("click", () => {
            let v = Number(dirInput.value);
            if (isNaN(v))
                v = 0;
            v = ((Math.floor(v) % 360) + 360) % 360;
            this.currentInfantry.direction = v;
            this.syncState();
        });
        dirWrap.appendChild(dirInput);
        dirWrap.appendChild(dirBtn);
        controls.appendChild(dirWrap);
        controls.appendChild(document.createTextNode("Auto rotate:"));
        const autoRot = document.createElement("input");
        autoRot.dataset.testid = "infantry-auto-rotate";
        autoRot.type = "checkbox";
        autoRot.style.display = "block";
        autoRot.checked = this.autoRotate;
        autoRot.addEventListener("change", (e) => {
            this.autoRotate = (e.target as HTMLInputElement).checked;
            this.syncState();
        });
        controls.appendChild(autoRot);
        this.hostElement?.appendChild(controls);
        TestToolSupport.applyPanelTheme(controls);
        this.syncState();
    }
    private static getZoneValues(): ZoneType[] {
        const values = [ZoneType.Ground];
        if (this.currentInfantry?.rules.consideredAircraft) {
            values.push(ZoneType.Air);
        }
        if (this.currentInfantry?.rules.speedType === SpeedType.Amphibious) {
            values.push(ZoneType.Water);
        }
        return values;
    }
    private static getStanceValues(): StanceType[] {
        const values = [StanceType.None, StanceType.Guard, StanceType.Paradrop, StanceType.Cheer];
        if (!this.currentInfantry?.rules.fearless) {
            values.push(StanceType.Prone);
        }
        if (this.currentInfantry?.rules.deployer) {
            values.push(StanceType.Deployed);
        }
        return values;
    }
    private static syncState(): void {
        const infantry = this.currentInfantry;
        const renderable = this.currentRenderable;
        const selectionLevel = renderable?.selectionModel?.getSelectionLevel?.();
        const veteranLevel = infantry?.veteranTrait?.veteranLevel ?? infantry?.veteranLevel ?? VeteranLevel.None;
        TestToolSupport.setState('infantry', {
            availableInfantry: this.listEl?.querySelectorAll('a').length ?? 0,
            selectedInfantry: this.currentInfantryType ?? null,
            rendered: Boolean(renderable?.get3DObject?.() ?? renderable),
            selectionLevelValue: selectionLevel ?? null,
            selectionLevel: TestToolSupport.enumLabel(SelectionLevel, selectionLevel),
            selectionLevelOptions: TestToolSupport.enumOptions(SelectionLevel, [SelectionLevel.None, SelectionLevel.Hover, SelectionLevel.Selected]),
            veteranLevelValue: infantry ? veteranLevel : null,
            veteranLevel: infantry ? TestToolSupport.enumLabel(VeteranLevel, veteranLevel) : null,
            veteranLevelOptions: TestToolSupport.enumOptions(VeteranLevel, [VeteranLevel.None, VeteranLevel.Veteran, VeteranLevel.Elite]),
            subCell: infantry?.position?.subCell ?? null,
            subCellOptions: [0, 1, 2, 3, 4].map(String),
            zoneValue: infantry?.zone ?? null,
            zone: TestToolSupport.enumLabel(ZoneType, infantry?.zone),
            zoneOptions: TestToolSupport.enumOptions(ZoneType, this.getZoneValues()),
            stanceValue: infantry?.stance ?? null,
            stance: TestToolSupport.enumLabel(StanceType, infantry?.stance),
            stanceOptions: TestToolSupport.enumOptions(StanceType, this.getStanceValues()),
            moveState: infantry?.moveTrait?.moveState ?? null,
            isMoving: infantry?.moveTrait?.moveState === MoveState.Moving,
            isFiring: Boolean(infantry?.isFiring),
            isPanicked: Boolean(infantry?.isPanicked),
            warpedOut: Boolean(infantry?.warpedOutTrait?.isActive?.()),
            direction: infantry?.direction ?? null,
            autoRotate: this.autoRotate,
            ownerColor: infantry?.owner?.color?.asHexString?.() ?? null,
        });
    }
    static createZoneSelect(container: HTMLElement): void {
        const select = document.createElement("select");
        select.dataset.testid = "infantry-zone";
        select.style.display = "block";
        select.addEventListener("change", () => {
            this.currentInfantry.zone = Number(select.value);
            this.syncState();
        });
        container.appendChild(select);
        this.getZoneValues().forEach((zoneValue) => {
            const option = document.createElement("option");
            option.value = String(zoneValue);
            option.innerHTML = ZoneType[zoneValue];
            option.selected = zoneValue === this.currentInfantry?.zone;
            select.appendChild(option);
        });
    }
    static createStanceSelect(container: HTMLElement): void {
        const select = document.createElement("select");
        select.dataset.testid = "infantry-stance";
        select.style.display = "block";
        select.addEventListener("change", () => {
            this.currentInfantry.stance = Number(select.value);
            this.syncState();
        });
        container.appendChild(select);
        this.getStanceValues().forEach((stanceValue) => {
            const option = document.createElement("option");
            option.value = String(stanceValue);
            option.innerHTML = StanceType[stanceValue];
            option.selected = stanceValue === this.currentInfantry?.stance;
            select.appendChild(option);
        });
    }
    static createDeathSelect(container: HTMLElement): void {
        container.appendChild(document.createTextNode("Death"));
        const select = document.createElement("select");
        select.dataset.testid = "infantry-death";
        let i = 1;
        let name: string | undefined = InfDeathType[i] as any;
        while (name !== undefined) {
            const option = document.createElement("option");
            option.innerHTML = name;
            option.value = String(i);
            option.disabled = !this.currentInfantry.rules.isHuman && ![InfDeathType.Gunfire, InfDeathType.Explode].includes(i as any);
            select.appendChild(option);
            name = InfDeathType[++i] as any;
        }
        container.appendChild(select);
        const kill = document.createElement("button");
        kill.dataset.testid = "infantry-kill";
        kill.style.display = "block";
        kill.style.color = "red";
        kill.innerHTML = "KILL";
        kill.addEventListener("click", async () => {
            this.currentInfantry.isDestroyed = true;
            this.currentInfantry.infDeathType = Number(select.value);
            this.world.removeObject(this.currentInfantry);
            this.currentInfantry.dispose();
            this.currentInfantry = undefined;
            this.currentInfantryType = undefined;
            if (this.controlsEl) {
                this.controlsEl?.remove();
                this.controlsEl = undefined;
            }
            this.syncState();
        });
        container.appendChild(kill);
    }
    static buildBrowser(infantryRules: Map<string, any>): void {
        const allTypes = [...infantryRules.keys()];
        const withArt = allTypes.filter((name) => this.art.hasObject(name, ObjectType.Infantry));
        const missingArt = allTypes.filter((name) => !this.art.hasObject(name, ObjectType.Infantry));
        console.info(`[InfantryTester] Rules infantry types: ${allTypes.length}, renderable (has art): ${withArt.length}, no-art: ${missingArt.length}`);
        if (missingArt.length) {
            const artIni = this.art.getIni?.() as any;
            const sample = missingArt.slice(0, 20).map((name) => {
                let imageName = "<unknown>";
                try {
                    imageName = (this.rules.getObject(name, ObjectType.Infantry) as any).imageName;
                }
                catch { }
                const hasName = !!artIni?.getSection?.(name);
                const hasImage = !!artIni?.getSection?.(imageName);
                return { name, imageName, hasName, hasImage };
            });
            console.warn('[InfantryTester] First missing-art infantry details:', sample);
        }
        const browser = (this.listEl = document.createElement("div"));
        browser.style.position = "absolute";
        browser.style.right = "0";
        browser.style.top = "0";
        browser.style.height = "600px";
        browser.style.width = "200px";
        browser.style.overflowY = "auto";
        browser.style.padding = "5px";
        browser.style.width = "200px";
        browser.style.background = "rgba(255, 255, 255, 0.5)";
        browser.style.border = "1px black solid";
        browser.appendChild(document.createTextNode("Infantry types:"));
        const types = withArt.sort();
        types.forEach((name) => {
            const link = document.createElement("a");
            link.dataset.infantryType = name;
            link.style.display = "block";
            link.textContent = name;
            link.setAttribute("href", "javascript:;");
            link.addEventListener("click", () => {
                console.log("Selected infantry", name);
                this.selectInfantry(name);
            });
            browser.appendChild(link);
        });
        this.hostElement?.appendChild(browser);
        TestToolSupport.applyPanelTheme(browser);
        this.syncState();
        setTimeout(() => {
            this.selectInfantry(types[0]);
            this.animateInfantry();
        }, 50);
    }
    private static animateInfantry(): void {
        if (!this.currentInfantry?.isDisposed && this.autoRotate) {
            this.currentInfantry.direction = (this.currentInfantry.direction + 1) % 360;
        }
        setTimeout(() => this.animateInfantry(), 50);
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
        this.currentInfantryType = undefined;
        this.currentInfantryColor = undefined;
        this.disposables.dispose();
        TestToolSupport.clearState('infantry');
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
            console.warn('[InfantryTester] Failed to clear caches during destroy:', err);
        }
    }
}
