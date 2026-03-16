import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class DestroyedBridgeCondition extends TriggerCondition {
    check(context: any, events: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.ObjectDestroy)
                return false;
            const target = event.target;
            if (!target.isOverlay() || !target.isBridge())
                return false;
            const bridgeSpec = target.bridgeTrait?.bridgeSpec;
            if (!bridgeSpec)
                return false;
            const bridgeTiles = context.map.bridges.findAllBridgeTiles(bridgeSpec);
            return bridgeTiles.find((tile) => this.targets.includes(tile));
        })
            .map((event) => event.target.tile);
    }
}
