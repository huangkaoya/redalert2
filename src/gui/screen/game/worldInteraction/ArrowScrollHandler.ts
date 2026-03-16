import * as THREE from 'three';
export class ArrowScrollHandler {
    private isPaused = false;
    private readonly scrollDir = new THREE.Vector2();
    private readonly pressedKeys = new Set<string>();
    constructor(private readonly mapScrollHandler: any) { }
    handleKeyDown(event: KeyboardEvent): void {
        if (this.isPaused || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) {
            return;
        }
        this.pressedKeys.add(event.key);
        this.updateScrollDir();
        this.mapScrollHandler.requestForceScroll(this.scrollDir);
    }
    handleKeyUp(event: KeyboardEvent): void {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.pressedKeys.delete(event.key);
        this.updateScrollDir();
        if (!this.scrollDir.length()) {
            this.mapScrollHandler.cancelForceScroll();
        }
    }
    cancel(): void {
        this.pressedKeys.clear();
        this.updateScrollDir();
        if (!this.scrollDir.length()) {
            this.mapScrollHandler.cancelForceScroll();
        }
    }
    pause(): void {
        this.isPaused = true;
    }
    unpause(): void {
        this.isPaused = false;
    }
    private updateScrollDir(): void {
        this.scrollDir.set(0, 0);
        for (const key of this.pressedKeys) {
            switch (key) {
                case 'ArrowUp':
                    this.scrollDir.y -= 1;
                    break;
                case 'ArrowDown':
                    this.scrollDir.y += 1;
                    break;
                case 'ArrowLeft':
                    this.scrollDir.x -= 1;
                    break;
                case 'ArrowRight':
                    this.scrollDir.x += 1;
                    break;
                default:
                    throw new Error(`Unhandled arrow key "${key}"`);
            }
        }
    }
}
