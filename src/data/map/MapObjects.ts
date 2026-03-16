import { ObjectType } from "@/engine/type/ObjectType";
export class MapObject {
    constructor(public type: ObjectType) { }
    isStructure(): boolean {
        return this.type === ObjectType.Building;
    }
    isVehicle(): boolean {
        return this.type === ObjectType.Vehicle;
    }
    isInfantry(): boolean {
        return this.type === ObjectType.Infantry;
    }
    isAircraft(): boolean {
        return this.type === ObjectType.Aircraft;
    }
    isTerrain(): boolean {
        return this.type === ObjectType.Terrain;
    }
    isSmudge(): boolean {
        return this.type === ObjectType.Smudge;
    }
    isOverlay(): boolean {
        return this.type === ObjectType.Overlay;
    }
    isNamed(): boolean {
        return "name" in this;
    }
    isTechno(): boolean {
        return "health" in this;
    }
}
export class Structure extends MapObject {
    constructor() {
        super(ObjectType.Building);
    }
}
export class Vehicle extends MapObject {
    constructor() {
        super(ObjectType.Vehicle);
    }
}
export class Infantry extends MapObject {
    constructor() {
        super(ObjectType.Infantry);
    }
}
export class Aircraft extends MapObject {
    constructor() {
        super(ObjectType.Aircraft);
    }
}
export class Terrain extends MapObject {
    constructor() {
        super(ObjectType.Terrain);
    }
}
export class Smudge extends MapObject {
    constructor() {
        super(ObjectType.Smudge);
    }
}
export class Overlay extends MapObject {
    constructor() {
        super(ObjectType.Overlay);
    }
}
