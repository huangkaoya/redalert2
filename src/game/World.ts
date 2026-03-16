import { EventDispatcher } from '@/util/event';
import { GameObject } from './gameobject/GameObject';
export class World {
    private allObjects: Map<number, GameObject>;
    private _onObjectSpawned: EventDispatcher;
    private _onObjectRemoved: EventDispatcher;
    constructor() {
        this.allObjects = new Map();
        this._onObjectSpawned = new EventDispatcher();
        this._onObjectRemoved = new EventDispatcher();
    }
    get onObjectSpawned() {
        return this._onObjectSpawned.asEvent();
    }
    get onObjectRemoved() {
        return this._onObjectRemoved.asEvent();
    }
    spawnObject(object: GameObject): void {
        if (this.allObjects.has(object.id)) {
            throw new Error("Trying to add an already existing object");
        }
        this.allObjects.set(object.id, object);
        this._onObjectSpawned.dispatch(this, object);
    }
    removeObject(object: GameObject): void {
        if (!this.allObjects.has(object.id)) {
            throw new Error("Trying to remove non-existent object");
        }
        this.allObjects.delete(object.id);
        this._onObjectRemoved.dispatch(this, object);
    }
    hasObjectId(id: number): boolean {
        return this.allObjects.has(id);
    }
    getObjectById(id: number): GameObject {
        if (!this.allObjects.has(id)) {
            throw new Error(`Object with id ${id} doesn't exist`);
        }
        return this.allObjects.get(id)!;
    }
    getAllObjects(): GameObject[] {
        return [...this.allObjects.values()];
    }
}
