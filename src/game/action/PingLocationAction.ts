import { Action } from './Action';
import { DataStream } from '@/data/DataStream';
import { ActionType } from './ActionType';
import { PingLocationEvent } from '../event/PingLocationEvent';
import { RadarEvent } from '../event/RadarEvent';
import { RadarEventType } from '../rules/general/RadarRules';
import { Game } from '../Game';
export class PingLocationAction extends Action {
    private game: Game;
    private tile: {
        x: number;
        y: number;
    };
    constructor(game: Game) {
        super(ActionType.PingLocation);
        this.game = game;
    }
    unserialize(data: Uint8Array): void {
        const stream = new DataStream(data);
        this.tile = {
            x: stream.readUint16(),
            y: stream.readUint16()
        };
    }
    serialize(): Uint8Array {
        const stream = new DataStream(4);
        stream.writeUint16(this.tile.x);
        stream.writeUint16(this.tile.y);
        return stream.toUint8Array();
    }
    print(): string {
        return `Ping location at tile (${this.tile.x}, ${this.tile.y})`;
    }
    process(): void {
        const player = this.player;
        const tile = this.game.map.tiles.getByMapCoords(this.tile.x, this.tile.y);
        if (tile) {
            this.game.events.dispatch(new PingLocationEvent(tile, player));
            const allies = [player, ...this.game.alliances.getAllies(player)];
            for (const ally of allies) {
                this.game.events.dispatch(new RadarEvent(ally, RadarEventType.GenericNonCombat, tile));
            }
        }
        else {
            console.warn(`Tile ${this.tile.x},${this.tile.y} doesn't exist`);
        }
    }
}
