import { CompositeDisposable } from '../util/disposable/CompositeDisposable';
import { getOffset } from '../util/dom';
export class CanvasMetrics {
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private canvas: HTMLCanvasElement;
    private window: Window;
    private disposables: CompositeDisposable;
    private updateCanvasBoxMetrics: () => void;
    constructor(canvas: HTMLCanvasElement, window: Window) {
        this.canvas = canvas;
        this.window = window;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.disposables = new CompositeDisposable();
        this.updateCanvasBoxMetrics = () => {
            const offset = getOffset(this.canvas);
            this.x = offset.left;
            this.y = offset.top;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        };
    }
    init(): void {
        this.updateCanvasBoxMetrics();
        this.window.addEventListener('resize', this.updateCanvasBoxMetrics);
        this.disposables.add(() => this.window.removeEventListener('resize', this.updateCanvasBoxMetrics));
    }
    notifyViewportChange(): void {
        this.updateCanvasBoxMetrics();
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
