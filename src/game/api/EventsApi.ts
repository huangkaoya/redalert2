import { EventType } from '@/game/event/EventType';
export enum ApiEventType {
    ObjectOwnerChange = 0,
    ObjectSpawn = 1,
    ObjectUnspawn = 2,
    ObjectDestroy = 3
}
interface AttackerInfo {
    playerName: string;
    objId?: string;
    weaponName?: string;
}
interface ObjectOwnerChangeEvent {
    type: ApiEventType.ObjectOwnerChange;
    prevOwnerName: string;
    newOwnerName: string;
    target: string;
}
interface ObjectSpawnEvent {
    type: ApiEventType.ObjectSpawn;
    target: string;
}
interface ObjectUnspawnEvent {
    type: ApiEventType.ObjectUnspawn;
    target: string;
}
interface ObjectDestroyEvent {
    type: ApiEventType.ObjectDestroy;
    target: string;
    attackerInfo?: AttackerInfo;
}
type ApiEvent = ObjectOwnerChangeEvent | ObjectSpawnEvent | ObjectUnspawnEvent | ObjectDestroyEvent;
export class EventsApi {
    private eventSource: any;
    private subscriptions: (() => void)[] = [];
    constructor(eventSource: any) {
        this.eventSource = eventSource;
    }
    subscribe(eventType: ApiEventType | ((event: ApiEvent) => void), callback?: (event: ApiEvent) => void) {
        const type = typeof eventType === 'function' ? undefined : eventType;
        const handler = typeof eventType === 'function' ? eventType : callback!;
        const subscription = this.eventSource.subscribe((event: any) => {
            const apiEvent = this.transformEvent(event);
            if (!apiEvent || (type !== undefined && type !== apiEvent.type)) {
                return;
            }
            handler(apiEvent);
        });
        this.subscriptions.push(subscription);
        return subscription;
    }
    dispose() {
        for (const subscription of this.subscriptions) {
            subscription();
        }
        this.subscriptions.length = 0;
    }
    private transformEvent(event: any): ApiEvent | undefined {
        switch (event.type) {
            case EventType.ObjectOwnerChange:
                return {
                    type: ApiEventType.ObjectOwnerChange,
                    prevOwnerName: event.prevOwner.name,
                    newOwnerName: event.target.owner.name,
                    target: event.target.id
                };
            case EventType.ObjectSpawn:
                return {
                    type: ApiEventType.ObjectSpawn,
                    target: event.gameObject.id
                };
            case EventType.ObjectUnspawn:
                return {
                    type: ApiEventType.ObjectUnspawn,
                    target: event.gameObject.id
                };
            case EventType.ObjectDestroy: {
                if (event.target.isProjectile()) {
                    return undefined;
                }
                return {
                    type: ApiEventType.ObjectDestroy,
                    target: event.target.id,
                    attackerInfo: event.attackerInfo ? {
                        playerName: event.attackerInfo.player.name,
                        objId: event.attackerInfo.obj?.id,
                        weaponName: event.attackerInfo.weapon?.rules.name
                    } : undefined
                };
            }
            default:
                return undefined;
        }
    }
}
