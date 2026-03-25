import { DataStream } from "@/data/DataStream";
import { Action } from "@/game/action/Action";
import { OrderType } from "@/game/order/OrderType";
import { orderPriorities } from "@/game/order/orderPriorities";
import { MoveOrder } from "@/game/order/MoveOrder";
import { MovePositionHelper } from "@/game/gameobject/unit/MovePositionHelper";
import { DeployOrder } from "@/game/order/DeployOrder";
import { CheerEvent } from "@/game/event/CheerEvent";
import { DeployNotAllowedEvent } from "@/game/event/DeployNotAllowedEvent";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { ScatterPositionHelper } from "@/game/gameobject/unit/ScatterPositionHelper";
import { ActionType } from "@/game/action/ActionType";
export const ORDER_UNIT_LIMIT = 128;
export class OrderUnitsAction extends Action {
    private game: any;
    private map: any;
    private orderActionContext: any;
    private orderFactory: any;
    public queue: boolean = false;
    private isInvalid: boolean = false;
    public orderType!: number;
    public target: any;
    constructor(game: any, map: any, orderActionContext: any, orderFactory: any) {
        super(ActionType.OrderUnits);
        this.game = game;
        this.map = map;
        this.orderActionContext = orderActionContext;
        this.orderFactory = orderFactory;
        this.queue = false;
        this.isInvalid = false;
    }
    unserialize(data: Uint8Array): void {
        let stream = new DataStream(data);
        this.orderType = stream.readUint8();
        const version = stream.readUint8();
        if (version !== 0) {
            const rx = stream.readUint16();
            const ry = stream.readUint16();
            this.queue = version > 2 && Boolean(stream.readUint8());
            let targetObject: any;
            if (version > 3) {
                const objectId = stream.readUint32();
                if (!this.game.getWorld().hasObjectId(objectId)) {
                    this.isInvalid = true;
                    return;
                }
                targetObject = this.game.getObjectById(objectId);
            }
            else {
                targetObject = undefined;
            }
            const tile = this.map.tiles.getByMapCoords(rx, ry);
            if (tile) {
                this.target = this.game.createTarget(targetObject, tile);
            }
            else {
                this.isInvalid = true;
            }
        }
    }
    serialize(): Uint8Array {
        let stream = new DataStream(11);
        stream.dynamicSize = false;
        stream.writeUint8(this.orderType);
        let extraDataSize = 0;
        stream.writeUint8(extraDataSize);
        if (this.target) {
            stream.writeUint16(this.target.tile.rx);
            stream.writeUint16(this.target.tile.ry);
            extraDataSize += 2;
            const objectId = (this.target.obj || this.target.getBridge())?.id;
            if (this.queue || objectId !== undefined) {
                stream.writeUint8(Number(this.queue));
                extraDataSize += 1;
            }
            if (objectId !== undefined) {
                stream.writeUint32(objectId);
                extraDataSize += 1;
            }
        }
        const currentPosition = stream.position;
        if (extraDataSize > 0) {
            stream.seek(1);
            stream.writeUint8(extraDataSize);
        }
        return new Uint8Array(stream.buffer, stream.byteOffset, currentPosition);
    }
    print(): string {
        if (this.isInvalid) {
            return "";
        }
        let result = OrderType[this.orderType] + " order ";
        if (this.target) {
            const objName = (this.target.obj || this.target.getBridge())?.name || "<none>";
            result += `[obj: ${objName}, tile: ${this.target.tile.rx},${this.target.tile.ry}]`;
            if (this.queue) {
                result += "(queue)";
            }
        }
        return result;
    }
    process(): void {
        if (this.isInvalid) {
            return;
        }
        const player = this.player;
        const shroud = this.game.mapShroudTrait.getPlayerShroud(player);
        if (!shroud) {
            return;
        }
        const targetObject = this.target?.obj;
        if (targetObject) {
            const tiles = this.game.map.tileOccupation.calculateTilesForGameObject(targetObject.tile, targetObject);
            if (!tiles.find((tile: any) => !shroud.isShrouded(tile, targetObject.tileElevation))) {
                return;
            }
        }
        const validatedOrders = this.validateOrders(player).slice(0, ORDER_UNIT_LIMIT);
        const processedOrders: any[] = [];
        const moveOrders: any[] = [];
        const scatterOrders: any[] = [];
        const deployOrders: any[] = [];
        const cheerOrders: any[] = [];
        validatedOrders.forEach((order: any) => {
            if (order instanceof MoveOrder) {
                moveOrders.push(order);
            }
            else if (order.orderType === OrderType.Scatter) {
                scatterOrders.push(order);
            }
            else if (order.orderType === OrderType.DeploySelected) {
                deployOrders.push(order);
            }
            else if (order.orderType === OrderType.Cheer) {
                cheerOrders.push(order);
            }
            else {
                processedOrders.push(order);
            }
        });
        if (moveOrders.length && this.target) {
            const isEnemyBuildingBlock = moveOrders[0].isEnemyBuildingBlock();
            const isFollowMove = moveOrders[0].isFollowMove();
            if (isEnemyBuildingBlock || isFollowMove) {
                moveOrders.forEach((order: any) => processedOrders.push(order));
            }
            else {
                const bridge = this.target.getBridge();
                const forceMove = moveOrders[0].forceMove;
                const units = moveOrders.map((order: any) => order.sourceObject);
                const positions = new MovePositionHelper(this.map).findPositions(units, this.target.tile, bridge, forceMove);
                moveOrders.forEach((order: any) => {
                    const position = positions.get(order.sourceObject);
                    const bridgeOnTile = !bridge || bridge.isHighBridge()
                        ? this.map.tileOccupation.getBridgeOnTile(position)
                        : bridge;
                    const target = this.game.createTarget(bridgeOnTile, position);
                    order.target = target;
                    processedOrders.push(order);
                });
            }
        }
        if (scatterOrders.length) {
            const scatterUnits = scatterOrders
                .map((order: any) => order.sourceObject)
                .filter((unit: any) => unit.isInfantry() || unit.isVehicle());
            const scatterPositions = new ScatterPositionHelper(this.game).findPositions(scatterUnits);
            scatterOrders.forEach((order: any) => {
                const position = scatterPositions.get(order.sourceObject);
                if (position) {
                    const target = this.game.createTarget(position.onBridge, position.tile);
                    order.target = target;
                    processedOrders.push(order);
                }
            });
        }
        if (deployOrders.length) {
            const deployableOrders: any[] = [];
            deployOrders.forEach((order: any) => {
                const unit = order.sourceObject;
                if ((unit.isInfantry() || unit.isVehicle()) && unit.deployerTrait) {
                    deployableOrders.push(order);
                }
                else {
                    processedOrders.push(order);
                }
            });
            const undeployedOrders = deployableOrders.filter((order: any) => !order.sourceObject.deployerTrait.isDeployed());
            if (undeployedOrders.length) {
                undeployedOrders.forEach((order: any) => processedOrders.push(order));
            }
            else {
                deployableOrders.forEach((order: any) => processedOrders.push(order));
            }
        }
        if (cheerOrders.length) {
            if (!player.cheerCooldownTicks) {
                player.cheerCooldownTicks = this.game.rules.general.maximumCheerRate;
                processedOrders.push(...cheerOrders);
                this.game.events.dispatch(new CheerEvent(player));
            }
        }
        processedOrders.forEach((order: any) => order.sourceObject.unitOrderTrait.addOrder(order, this.queue));
        this.updateWaypointPaths(processedOrders);
    }
    private validateOrders(player: any): any[] {
        const selection = this.orderActionContext.getOrCreateSelection(player);
        const selectedUnits = selection.getSelectedUnits();
        const baseOrder = this.orderFactory.create(this.orderType, selection);
        baseOrder.target = this.target;
        const validOrders: any[] = [];
        for (const unit of selectedUnits) {
            if (unit.owner !== player ||
                unit.rules.spawned ||
                unit.isDestroyed ||
                unit.isCrashing ||
                unit.isDisposed ||
                unit.warpedOutTrait.isActive()) {
                continue;
            }
            baseOrder.sourceObject = unit;
            if (baseOrder instanceof DeployOrder && baseOrder.isValid() && !baseOrder.isAllowed()) {
                this.game.events.dispatch(new DeployNotAllowedEvent(unit));
            }
            if (baseOrder.singleSelectionRequired && selectedUnits.length > 1) {
                continue;
            }
            if (baseOrder.isValid() && baseOrder.isAllowed()) {
                const order = this.orderFactory.create(this.orderType, selection);
                order.set(unit, this.target);
                validOrders.push(order);
            }
            else {
                let orderFound = false;
                for (const priorityOrderType of orderPriorities) {
                    const order = this.orderFactory.create(priorityOrderType, selection);
                    order.set(unit, this.target);
                    if (!(order.singleSelectionRequired && selectedUnits.length > 1) &&
                        order.targetOptional === !this.target &&
                        order.isValid() &&
                        order.isAllowed()) {
                        validOrders.push(order);
                        orderFound = true;
                        break;
                    }
                }
                if (!orderFound && this.target && this.orderType !== OrderType.Deploy) {
                    const moveOrder = this.orderFactory.create(OrderType.Move, selection);
                    moveOrder.set(unit, this.target);
                    if (moveOrder.isValid() && moveOrder.isAllowed()) {
                        validOrders.push(moveOrder);
                    }
                }
            }
        }
        return validOrders;
    }
    private updateWaypointPaths(orders: any[]): void {
        if (!this.queue || !this.target) {
            return;
        }
        const units = orders.map((order: any) => order.sourceObject);
        const waypointPaths = [
            ...new Set(units
                .map((unit: any) => unit.unitOrderTrait.waypointPath)
                .filter(isNotNullOrUndefined))
        ];
        if (waypointPaths.length <= 1) {
            const waypoint = {
                orderType: this.orderType,
                target: this.target,
                terminal: orders.some((order: any) => order.terminal),
                next: undefined
            };
            if (waypointPaths.length === 0) {
                const pendingLoopOrders = new Map();
                for (const order of orders) {
                    const unit = order.sourceObject;
                    if (!pendingLoopOrders.has(unit)) {
                        pendingLoopOrders.set(unit, []);
                    }
                    pendingLoopOrders.get(unit).push(order);
                }
                const waypointPath = { units: units, waypoints: [waypoint], pendingLoopOrders: pendingLoopOrders };
                units.forEach((unit: any) => {
                    unit.unitOrderTrait.waypointPath = waypointPath;
                });
            }
            else {
                const existingPath = waypointPaths[0];
                existingPath.waypoints[existingPath.waypoints.length - 1].next = waypoint;
                existingPath.waypoints.push(waypoint);
                if (!existingPath.pendingLoopOrders) {
                    existingPath.pendingLoopOrders = new Map();
                }
                for (const order of orders) {
                    const unit = order.sourceObject;
                    if (!existingPath.pendingLoopOrders.has(unit)) {
                        existingPath.pendingLoopOrders.set(unit, []);
                    }
                    existingPath.pendingLoopOrders.get(unit).push(order);
                }
                if (existingPath.waypoints.length >= 2 &&
                    waypoint.target.equals(existingPath.waypoints[0].target)) {
                    existingPath.loop = true;
                    existingPath.loopWaypoints = existingPath.waypoints.map((wp: any) => ({
                        orderType: wp.orderType,
                        target: wp.target,
                        terminal: wp.terminal,
                    }));
                    existingPath.loopOrders = existingPath.pendingLoopOrders;
                }
            }
        }
    }
}
