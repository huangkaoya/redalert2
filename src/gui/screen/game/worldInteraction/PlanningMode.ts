import { OrderType } from '@/game/order/OrderType';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
import { ObjectType } from '@/engine/type/ObjectType';
import { isNotNullOrUndefined } from '@/util/typeGuard';
import { WaypointLines } from '@/engine/renderable/entity/WaypointLines';
import { ORDER_UNIT_LIMIT } from '@/game/action/OrderUnitsAction';
export class PlanningMode {
    private active = false;
    private paths: any[] = [];
    private selectedPaths: any[] = [];
    private selectedUnits = new Set<any>();
    private lastUpdate?: number;
    private waypointLines?: WaypointLines;
    constructor(private readonly player: any, private readonly messageList: any, private readonly sound: any, private readonly strings: any, private readonly worldScene: any, private readonly unitSelection: any, private readonly unitSelectionHandler: any, private readonly renderer: any, private readonly targetLines: any, private readonly maxWaypointPathLength: number) { }
    private readonly onFrame = (time: number): void => {
        if (this.lastUpdate === undefined || time - this.lastUpdate > 1000 / 15) {
            this.lastUpdate = time;
            this.updatePaths();
        }
    };
    isActive(): boolean {
        return this.active;
    }
    enter(): void {
        if (this.active) {
            return;
        }
        this.active = true;
        if (this.targetLines.get3DObject()) {
            this.targetLines.get3DObject().visible = false;
        }
        this.renderer.onFrame.subscribe(this.onFrame);
        const waypointPaths = new Set([
            ...this.player.getOwnedObjectsByType(ObjectType.Infantry),
            ...this.player.getOwnedObjectsByType(ObjectType.Vehicle),
        ]
            .map((unit: any) => unit.unitOrderTrait.waypointPath)
            .filter(isNotNullOrUndefined));
        this.paths = [...waypointPaths].map((path: any) => {
            const clonedPath = {
                original: path,
                units: new Set(path.units),
                waypoints: [] as any[],
            };
            path.waypoints.forEach((waypoint: any) => {
                const clonedWaypoint = {
                    orderType: waypoint.orderType,
                    target: waypoint.target,
                    next: undefined,
                    draft: false,
                    terminal: waypoint.terminal,
                    original: waypoint,
                };
                if (clonedPath.waypoints.length) {
                    clonedPath.waypoints[clonedPath.waypoints.length - 1].next = clonedWaypoint;
                }
                clonedPath.waypoints.push(clonedWaypoint);
            });
            return clonedPath;
        });
        this.waypointLines = new WaypointLines(this.unitSelection, this.player, this.selectedPaths, this.paths, this.worldScene.camera);
        this.worldScene.add(this.waypointLines);
    }
    pushOrder(orderType: OrderType, target: any, terminal: boolean): void {
        if (orderType === OrderType.Deploy) {
            this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoDeploy'));
            return;
        }
        if (this.selectedPaths.length > 1) {
            this.handleInvalidCommand(this.strings.get('MSG:PlanningModeHeteroSel'));
            return;
        }
        if (this.selectedUnits.size > ORDER_UNIT_LIMIT) {
            this.handleInvalidCommand(this.strings.get('MSG:PlannerMaximum'));
            return;
        }
        for (const unit of this.selectedUnits) {
            if (unit.isBuilding?.()) {
                this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoBuildings'));
                return;
            }
            if (unit.isAircraft?.()) {
                this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoAircraft'));
                return;
            }
        }
        let path = this.selectedPaths[0];
        if (!path && this.selectedUnits.size) {
            path = { original: undefined, units: new Set(this.selectedUnits), waypoints: [] };
            this.paths.push(path);
            this.selectedPaths.push(path);
        }
        if (!path) {
            return;
        }
        if (path.waypoints.length === this.maxWaypointPathLength) {
            this.handleInvalidCommand(this.strings.get('MSG:NodeMaximum'));
            return;
        }
        if (path.waypoints.find((waypoint: any) => waypoint.target.equals(target))) {
            this.handleInvalidCommand(this.strings.get('MSG:PlanningModeInvalidNodeX'));
            return;
        }
        if (path.waypoints.length && path.waypoints.slice(path.waypoints[0].draft ? 0 : 1).find((waypoint: any) => waypoint.terminal)) {
            this.handleInvalidCommand(this.strings.get('MSG:PostTerminatingCommand'));
            return;
        }
        const waypoint = {
            orderType,
            target,
            terminal,
            next: undefined,
            draft: true,
            original: undefined,
        };
        if (path.waypoints.length) {
            path.waypoints[path.waypoints.length - 1].next = waypoint;
        }
        path.waypoints.push(waypoint);
        if (terminal) {
            this.handleInvalidCommand(this.strings.get('MSG:PostTerminatingCommand'));
            this.unitSelectionHandler.deselectAll();
            return;
        }
        this.sound.play(SoundKey.AddPlanningModeCommandSound, ChannelType.Ui);
    }
    exit(): any[] {
        const paths = this.paths;
        if (this.active) {
            if (this.targetLines.get3DObject()) {
                this.targetLines.get3DObject().visible = true;
            }
            this.renderer.onFrame.unsubscribe(this.onFrame);
            this.active = false;
            this.paths = [];
            this.selectedPaths = [];
            this.selectedUnits.clear();
            if (this.waypointLines) {
                this.worldScene.remove(this.waypointLines);
                this.waypointLines.dispose();
                this.waypointLines = undefined;
            }
        }
        for (const path of paths) {
            path.waypoints = path.waypoints.filter((waypoint: any) => waypoint.draft);
        }
        return paths.filter((path) => path.waypoints.length);
    }
    private updatePaths(): void {
        for (const path of [...this.paths]) {
            if (path.original) {
                if (!(path.original.units.length === path.units.size || path.waypoints.find((waypoint: any) => waypoint.draft))) {
                    path.units = new Set(path.original.units);
                }
                if (path.original.units.length === 0) {
                    path.waypoints = path.waypoints.filter((waypoint: any) => waypoint.draft);
                }
                else {
                    path.waypoints = path.waypoints.filter((waypoint: any) => waypoint.draft || path.original.waypoints.includes(waypoint.original));
                }
                if (!path.waypoints.length) {
                    this.paths.splice(this.paths.indexOf(path), 1);
                    const selectedIndex = this.selectedPaths.indexOf(path);
                    if (selectedIndex !== -1) {
                        this.selectedPaths.splice(selectedIndex, 1);
                    }
                }
            }
        }
    }
    updateSelection(selection: any[]): any[] | undefined {
        this.updatePaths();
        const nextSelection = [...selection];
        const selectedPaths = new Set<any>();
        for (const unit of selection) {
            for (const path of this.paths) {
                if (path.units.has(unit)) {
                    selectedPaths.add(path);
                    nextSelection.push(...path.units);
                }
            }
        }
        this.selectedPaths.length = 0;
        this.selectedPaths.push(...selectedPaths);
        this.selectedUnits = new Set(nextSelection);
        if (this.selectedUnits.size !== selection.length) {
            return [...this.selectedUnits];
        }
    }
    private handleInvalidCommand(message: string): void {
        this.sound.play(SoundKey.ScoldSound, ChannelType.Ui);
        this.messageList.addUiFeedbackMessage(message);
    }
    dispose(): void {
        this.exit();
    }
}
