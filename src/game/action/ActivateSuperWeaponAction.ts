import { DataStream } from '@/data/DataStream';
import { Action } from '@/game/action/Action';
import { ActionType } from '@/game/action/ActionType';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';
import { SuperWeaponsTrait } from '@/game/trait/SuperWeaponsTrait';
import { Game } from '@/game/Game';
export class ActivateSuperWeaponAction extends Action {
    private game: Game;
    private superWeaponType: number;
    private tile: {
        x: number;
        y: number;
    };
    private tile2?: {
        x: number;
        y: number;
    };
    constructor(game: Game) {
        super(ActionType.ActivateSuperWeapon);
        this.game = game;
    }
    unserialize(data: Uint8Array): void {
        const stream = new DataStream(data);
        this.superWeaponType = stream.readUint8();
        const tileCount = stream.readUint8();
        this.tile = {
            x: stream.readUint16(),
            y: stream.readUint16()
        };
        if (tileCount > 2) {
            this.tile2 = {
                x: stream.readUint16(),
                y: stream.readUint16()
            };
        }
    }
    serialize(): Uint8Array {
        const stream = new DataStream(6 + (this.tile2 ? 4 : 0));
        stream.dynamicSize = false;
        stream.writeUint8(this.superWeaponType);
        stream.writeUint8(this.tile2 ? 4 : 2);
        stream.writeUint16(this.tile.x);
        stream.writeUint16(this.tile.y);
        if (this.tile2) {
            stream.writeUint16(this.tile2.x);
            stream.writeUint16(this.tile2.y);
        }
        return stream.toUint8Array();
    }
    print(): string {
        return `Activate SuperW ${SuperWeaponType[this.superWeaponType]} at tile (${this.tile.x}, ${this.tile.y})` +
            (this.tile2 ? `, (${this.tile2.x}, ${this.tile2.y})` : '');
    }
    process(): void {
        const player = this.player;
        const tile = this.game.map.tiles.getByMapCoords(this.tile.x, this.tile.y);
        if (!tile) {
            console.warn(`Tile ${this.tile.x},${this.tile.y} doesn't exist`);
            return;
        }
        const tile2 = this.tile2
            ? this.game.map.tiles.getByMapCoords(this.tile2.x, this.tile2.y)
            : undefined;
        this.game.traits
            .get(SuperWeaponsTrait)
            .activateSuperWeapon(this.superWeaponType, player, this.game, tile, tile2);
    }
}
