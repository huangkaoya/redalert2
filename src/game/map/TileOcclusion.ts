import * as m from "@/game/math/Vector2";
export class TileOcclusion {
    tiles: any;
    tileOcclusion: any[][];
    constructor(e: any) {
        this.tiles = e;
        this.tileOcclusion = [];
        let t = this.tileOcclusion;
        for (var i of e.getAll())
            (t[i.rx] = t[i.rx] || []), (t[i.rx][i.ry] = new Set());
    }
    addOccluder(t: any) {
        let e = this.calculateTilesForGameObject(t);
        e.forEach((e: any) => this.occludeTile(e, t));
    }
    removeOccluder(t: any) {
        let e = this.calculateTilesForGameObject(t);
        e.forEach((e: any) => this.unoccludeTile(e, t));
    }
    calculateTilesForGameObject(e: any) {
        var t = e.art.occupyHeight, i = Math.max(0, t - 2);
        let r = [];
        var s = e.getFoundation();
        for (let u = 1; u <= i; u++)
            for (let e = 0; e < s.width; e++)
                r.push(new m.Vector2(e - u, -u));
        for (let d = 1; d <= i; d++)
            for (let e = 1; e < s.height; e++)
                r.push(new m.Vector2(-d, e - d));
        r.push(...e.art.addOccupy);
        for (let { x: g, y: p } of e.art.removeOccupy) {
            var a = r.findIndex((e: any) => e.x === g && e.y === p);
            -1 !== a && r.splice(a, 1);
        }
        var n: any, o: any, l = e.tile;
        let c = [];
        for ({ x: n, y: o } of r) {
            var h = this.tiles.getByMapCoords(l.rx + n, l.ry + o);
            h && c.push(h);
        }
        return c;
    }
    occludeTile(e: any, t: any) {
        this.tileOcclusion[e.rx][e.ry].add(t);
        e.occluded = true;
    }
    unoccludeTile(e: any, t: any) {
        let i = this.tileOcclusion[e.rx][e.ry];
        i.delete(t);
        e.occluded = 0 < i.size;
    }
    isTileOccluded(e: any) {
        return 0 < this.tileOcclusion[e.rx][e.ry].size;
    }
}
