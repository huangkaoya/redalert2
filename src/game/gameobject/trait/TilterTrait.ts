import { NotifySpawn } from './interface/NotifySpawn';
import { NotifyTileChange } from './interface/NotifyTileChange';
export class TilterTrait {
    private tilt: {
        pitch: number;
        yaw: number;
    };
    constructor() {
        this.tilt = { pitch: 0, yaw: 0 };
    }
    [NotifySpawn.onSpawn](target: any): void {
        this.tilt = this.computeTilt(target.tile.rampType);
    }
    [NotifyTileChange.onTileChange](target: any): void {
        this.tilt = this.computeTilt(target.tile.rampType);
    }
    private computeTilt(rampType: number): {
        pitch: number;
        yaw: number;
    } {
        let pitch: number;
        let yaw: number;
        if (rampType === 0 || rampType >= 17) {
            pitch = yaw = 0;
        }
        else if (rampType <= 4) {
            pitch = 25;
            yaw = -90 * rampType;
        }
        else {
            pitch = 25;
            yaw = 225 - ((rampType - 1) % 4) * 90;
        }
        return { pitch, yaw };
    }
}
