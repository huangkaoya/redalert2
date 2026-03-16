import { BoxedVar } from '../../util/BoxedVar';
export class CameraZoom {
    private freeCamera: BoxedVar<boolean>;
    private zoom: number;
    constructor(freeCamera: BoxedVar<boolean>) {
        this.freeCamera = freeCamera;
        this.zoom = 1;
    }
    getZoom(): number {
        return this.zoom;
    }
    applyStep(step: number): void {
        if (this.freeCamera.value) {
            this.zoom = Math.max(0.1, this.zoom + step);
        }
    }
}
