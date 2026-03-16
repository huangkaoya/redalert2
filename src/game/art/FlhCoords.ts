export class FlhCoords {
    public forward: number;
    public lateral: number;
    public vertical: number;
    constructor(coords?: number[]) {
        this.forward = 0;
        this.lateral = 0;
        this.vertical = 0;
        if (coords && coords.length === 3) {
            this.fromArray(coords);
        }
    }
    fromArray(coords: number[]): FlhCoords {
        this.forward = coords[0];
        this.lateral = coords[1];
        this.vertical = coords[2];
        return this;
    }
    clone(): FlhCoords {
        return new FlhCoords([this.forward, this.lateral, this.vertical]);
    }
}
