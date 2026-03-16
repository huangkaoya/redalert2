import { PointerEvents } from '../gui/PointerEvents';
import { CameraZoom } from '../engine/renderable/CameraZoom';
interface PointerEventData {
    wheelDeltaY: number;
}
export class CameraZoomControls {
    private pointerEvents: PointerEvents;
    private cameraZoom: CameraZoom;
    private handleWheel: (event: PointerEventData) => void;
    constructor(pointerEvents: PointerEvents, cameraZoom: CameraZoom) {
        this.pointerEvents = pointerEvents;
        this.cameraZoom = cameraZoom;
        this.handleWheel = (event: PointerEventData) => {
            this.cameraZoom.applyStep(event.wheelDeltaY > 0 ? -0.1 : 0.1);
        };
    }
    init(): void {
        this.pointerEvents.addEventListener("canvas", "wheel", this.handleWheel);
    }
    destroy(): void {
        this.pointerEvents.removeEventListener("canvas", "wheel", this.handleWheel);
    }
}
