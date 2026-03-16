import { clamp } from '../../util/math';
import { BoxedVar } from '../../util/BoxedVar';
export class CameraPan {
    private freeCamera: BoxedVar<boolean>;
    private pan: {
        x: number;
        y: number;
    };
    private panLimits?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    constructor(freeCamera: BoxedVar<boolean>) {
        this.freeCamera = freeCamera;
        this.pan = { x: 0, y: 0 };
    }
    setPanLimits(limits: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void {
        this.panLimits = limits;
        this.setPan({ x: this.pan.x, y: this.pan.y });
    }
    getPanLimits(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        return { ...this.panLimits! };
    }
    getPan(): {
        x: number;
        y: number;
    } {
        return { ...this.pan };
    }
    setPan(pan: {
        x: number;
        y: number;
    }): void {
        if (this.panLimits && !this.freeCamera.value) {
            pan.x = clamp(pan.x, this.panLimits.x, this.panLimits.x + this.panLimits.width);
            pan.y = clamp(pan.y, this.panLimits.y, this.panLimits.y + this.panLimits.height);
        }
        this.pan = { x: pan.x, y: pan.y };
    }
}
