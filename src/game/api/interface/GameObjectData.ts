export interface GameObjectData {
    id: any;
    type: string;
    name: string;
    rules: any;
    tile: any;
    tileElevation: number;
    worldPosition: any;
    foundation: any;
    hitPoints?: number;
    maxHitPoints?: number;
    owner?: string;
}
