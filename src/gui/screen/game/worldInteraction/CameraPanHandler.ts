import * as THREE from 'three';
import { pointEquals } from '@/util/geometry';
import { PointerType } from '@/engine/type/PointerType';
import { clamp } from '@/util/math';
export class CameraPanHandler {
    private startPos?: {
        x: number;
        y: number;
    };
    private initialPan?: {
        x: number;
        y: number;
    };
    private readonly panVector = new THREE.Vector2();
    private isPanning = false;
    private paused = false;
    private stickyMode = false;
    private lastUpdate?: number;
    constructor(private readonly cameraPan: any, private readonly pointer: any, private readonly panRate: any, private readonly freeCamera: any, private readonly worldScene: any) { }
    private readonly onFrame = (time: number): void => {
        if (this.paused ||
            !this.isPanning ||
            (this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 60)) {
            return;
        }
        this.lastUpdate = time;
        if (!this.panVector.x && !this.panVector.y) {
            this.pointer.setPointerType(PointerType.Pan);
            return;
        }
        const currentPan = this.stickyMode ? this.initialPan! : this.cameraPan.getPan();
        const panLimits = this.cameraPan.getPanLimits();
        let nextPan = {
            x: clamp(currentPan.x + this.panVector.x, panLimits.x, panLimits.x + panLimits.width),
            y: clamp(currentPan.y + this.panVector.y, panLimits.y, panLimits.y + panLimits.height),
        };
        if (this.freeCamera.value) {
            nextPan = {
                x: currentPan.x + this.panVector.x,
                y: currentPan.y + this.panVector.y,
            };
        }
        const panChanged = !pointEquals(nextPan, currentPan);
        const blockedX = this.panVector.x && nextPan.x === currentPan.x;
        const blockedY = this.panVector.y && nextPan.y === currentPan.y;
        let subFrame = 0;
        if (blockedX || blockedY) {
            const blocked = new THREE.Vector2(blockedX ? Math.sign(this.panVector.x) : 0, blockedY ? Math.sign(this.panVector.y) : 0);
            subFrame = 1 + ((THREE.MathUtils.radToDeg(blocked.angle()) + 90) % 360) / 45;
        }
        this.pointer.setPointerType(PointerType.Pan, subFrame);
        if (panChanged) {
            this.cameraPan.setPan(nextPan);
        }
        this.isPanning = panChanged;
    };
    start(pointer: {
        x: number;
        y: number;
    }): void {
        this.startPos = pointer;
        this.initialPan = undefined;
        this.isPanning = false;
        this.panVector.set(0, 0);
        this.worldScene.onBeforeCameraUpdate.subscribe(this.onFrame);
    }
    update(pointer: {
        x: number;
        y: number;
    }, sticky: boolean): void {
        if (!this.startPos) {
            return;
        }
        if (sticky) {
            this.initialPan ||= this.cameraPan.getPan();
            this.panVector.x = this.startPos.x - pointer.x;
            this.panVector.y = this.startPos.y - pointer.y;
        }
        else {
            const rate = (this.panRate.value / 5) * 100;
            this.panVector.x = Math.floor((rate * clamp(pointer.x - this.startPos.x, -600, 600)) / 600);
            this.panVector.y = Math.floor((rate * clamp(pointer.y - this.startPos.y, -600, 600)) / 600);
        }
        this.isPanning = true;
        this.stickyMode = sticky;
    }
    finish(): void {
        this.worldScene.onBeforeCameraUpdate.unsubscribe(this.onFrame);
        this.pointer.setPointerType(PointerType.Default);
        this.initialPan = undefined;
        this.startPos = undefined;
        this.isPanning = false;
        this.panVector.set(0, 0);
    }
    setPaused(paused: boolean): void {
        this.paused = paused;
    }
    dispose(): void {
        this.finish();
    }
}
