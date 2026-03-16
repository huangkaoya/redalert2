import { EntityIntersectHelper } from '@/engine/util/EntityIntersectHelper';
import { MapTileIntersectHelper } from '@/engine/util/MapTileIntersectHelper';
import { RaycastHelper } from '@/engine/util/RaycastHelper';
import { WorldViewportHelper } from '@/engine/util/WorldViewportHelper';
import { TargetLines } from '@/engine/renderable/entity/TargetLines';
import { MapPanningHelper } from '@/engine/util/MapPanningHelper';
import { DefaultActionHandler } from './DefaultActionHandler';
import { CameraPanHandler } from './CameraPanHandler';
import { MapScrollHandler } from './MapScrollHandler';
import { MapHoverHandler } from './MapHoverHandler';
import { TooltipHandler } from './TooltipHandler';
import { ArrowScrollHandler } from './ArrowScrollHandler';
import { CustomScrollHandler } from './CustomScrollHandler';
import { MinimapHandler } from './MinimapHandler';
import { UnitSelectionHandler } from './UnitSelectionHandler';
import { WorldInteraction } from './WorldInteraction';
import { KeyboardHandler } from './keyboard/KeyboardHandler';
export class WorldInteractionFactory {
    constructor(private localPlayer: any, private game: any, private unitSelection: any, private renderableManager: any, private uiScene: any, private worldScene: any, private pointer: any, private renderer: any, private keyBinds: any, private generalOptions: any, private freeCamera: any, private debugPaths: any, private devMode: boolean, private document: Document, private minimap: any, private strings: any, private textColor: string, private debugText: any, private battleControlApi: any) { }
    create(): any {
        const map = this.game.map;
        const worldScene = this.worldScene;
        const pointer = this.pointer;
        const renderer = this.renderer;
        const mapTileIntersectHelper = new MapTileIntersectHelper(map, worldScene);
        const raycastHelper = new RaycastHelper(this.worldScene);
        const worldViewportHelper = new WorldViewportHelper(this.worldScene);
        const entityIntersectHelper = new EntityIntersectHelper(map, this.renderableManager, mapTileIntersectHelper, raycastHelper, this.worldScene, worldViewportHelper);
        const unitSelectionHandler = new UnitSelectionHandler(this.worldScene, this.uiScene, this.localPlayer, this.unitSelection, entityIntersectHelper, this.game.rules.general.veteran.veteranCap);
        const defaultActionHandler = DefaultActionHandler.factory(this.renderableManager, this.unitSelection, unitSelectionHandler, this.localPlayer, map, this.game, this.game.rules.audioVisual);
        const shroud = this.localPlayer ? this.game.mapShroudTrait.getPlayerShroud(this.localPlayer) : undefined;
        const keyboardHandler = new KeyboardHandler(this.keyBinds, this.devMode);
        const mapHoverHandler = new MapHoverHandler(entityIntersectHelper, mapTileIntersectHelper, map, shroud, renderer);
        const mapScrollHandler = new MapScrollHandler(renderer.getCanvas(), worldScene.cameraPan, pointer, this.generalOptions.scrollRate, worldScene);
        const tooltipHandler = new TooltipHandler(mapHoverHandler, this.textColor, pointer, this.uiScene, renderer, this.strings, this.debugText);
        const arrowScrollHandler = new ArrowScrollHandler(mapScrollHandler);
        const customScrollHandler = new CustomScrollHandler(mapScrollHandler);
        const minimapHandler = new MinimapHandler(this.minimap, map, shroud, worldScene, new MapPanningHelper(map));
        const targetLines = new TargetLines(this.localPlayer, this.unitSelection, worldScene.camera, this.debugPaths, this.generalOptions.targetLines);
        const worldInteraction = new WorldInteraction(worldScene, pointer, pointer.pointerEvents, new CameraPanHandler(worldScene.cameraPan, pointer, this.generalOptions.scrollRate, this.freeCamera, worldScene), mapScrollHandler, mapHoverHandler, tooltipHandler, entityIntersectHelper, unitSelectionHandler, defaultActionHandler, keyboardHandler, arrowScrollHandler, customScrollHandler, minimapHandler, worldScene.cameraZoom, this.document, renderer, targetLines, this.generalOptions.rightClickMove, this.generalOptions.rightClickScroll, this.battleControlApi);
        const debugRoot = ((window as any).__ra2debug ??= {});
        debugRoot.entityIntersectHelper = entityIntersectHelper;
        debugRoot.mapTileIntersectHelper = mapTileIntersectHelper;
        return worldInteraction;
    }
}
