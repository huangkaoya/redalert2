import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Tooltip } from './Tooltip';
import { resolveHoverTooltipText } from '@/gui/screen/game/TooltipTextResolver';
class HoverTarget {
    entity?: any;
    uiObject?: any;
    equals(other: HoverTarget): boolean {
        return (this.entity ?? this.uiObject) === (other.entity ?? other.uiObject);
    }
    copy(other: HoverTarget): void {
        this.entity = other.entity;
        this.uiObject = other.uiObject;
    }
}
export class TooltipHandler {
    static readonly ZINDEX = 100;
    private readonly disposables = new CompositeDisposable();
    private readonly currentHover = new HoverTarget();
    private readonly lastHover = new HoverTarget();
    private tooltip?: Tooltip;
    private hoverStartTime?: number;
    private lastUpdateTime?: number;
    private isTouch = false;
    private needsHoverTimeReset = false;
    private paused = false;
    constructor(private readonly mapHoverHandler: any, private readonly tooltipTextColor: string, private readonly pointer: any, private readonly uiScene: any, private readonly renderer: any, private readonly strings: any, private readonly debugText: any) { }
    private readonly handleUiMouseMove = (event: any): void => {
        const intersectionObject = event.intersection?.object;
        let tooltipTarget = intersectionObject;
        while (tooltipTarget && tooltipTarget.userData?.tooltip === undefined) {
            tooltipTarget = tooltipTarget.parent;
        }
        this.currentHover.uiObject = tooltipTarget ?? intersectionObject;
        if (this.hoverStartTime !== undefined) {
            this.needsHoverTimeReset = true;
        }
        this.isTouch = !!event.isTouch;
    };
    private readonly handleMouseDown = (): void => {
        this.paused = true;
        this.reset();
    };
    private readonly handleMouseUp = (event: any): void => {
        this.paused = false;
        this.isTouch = !!event.isTouch;
    };
    private readonly handleMouseWheel = (): void => {
        this.reset();
    };
    private readonly onFrame = (): void => {
        const now = performance.now();
        if (this.lastUpdateTime !== undefined && now - this.lastUpdateTime < 1000 / 15) {
            return;
        }
        this.lastUpdateTime = now;
        this.currentHover.entity = this.mapHoverHandler.getCurrentHover()?.entity;
        if (this.paused) {
            return;
        }
        if (this.currentHover.equals(this.lastHover)) {
            if (this.needsHoverTimeReset) {
                this.needsHoverTimeReset = false;
                this.hoverStartTime = now;
            }
            const hoverDelay = this.currentHover.entity ? 800 : 400;
            if (this.hoverStartTime !== undefined &&
                now - this.hoverStartTime > hoverDelay) {
                const tooltipText = this.getTooltipText(this.currentHover);
                if (tooltipText && !this.tooltip && !this.isTouch) {
                    const tooltip = new Tooltip(tooltipText, this.tooltipTextColor, this.pointer, this.uiScene.viewport);
                    tooltip.setZIndex(TooltipHandler.ZINDEX);
                    this.tooltip = tooltip;
                    this.uiScene.add(tooltip);
                }
            }
            return;
        }
        this.lastHover.copy(this.currentHover);
        this.hoverStartTime = undefined;
        this.destroyTooltip();
        if (this.getTooltipText(this.currentHover) !== undefined) {
            this.hoverStartTime = now;
        }
    };
    init(): void {
        this.disposables.add(this.pointer.pointerEvents.addEventListener(this.uiScene.get3DObject(), 'mousemove', this.handleUiMouseMove));
        this.disposables.add(this.pointer.pointerEvents.addEventListener('canvas', 'mousedown', this.handleMouseDown), this.pointer.pointerEvents.addEventListener('canvas', 'wheel', this.handleMouseWheel), this.pointer.pointerEvents.addEventListener('canvas', 'mouseup', this.handleMouseUp));
        this.renderer.onFrame.subscribe(this.onFrame);
        this.disposables.add(() => this.renderer.onFrame.unsubscribe(this.onFrame));
    }
    reset(): void {
        this.destroyTooltip();
        if (this.hoverStartTime !== undefined) {
            this.needsHoverTimeReset = true;
        }
    }
    private getTooltipText(hover: HoverTarget): string | undefined {
        return resolveHoverTooltipText(hover, this.strings, this.debugText.value);
    }
    private destroyTooltip(): void {
        if (this.tooltip) {
            this.uiScene.remove(this.tooltip);
            this.tooltip.destroy();
            this.tooltip = undefined;
        }
    }
    dispose(): void {
        this.disposables.dispose();
        this.destroyTooltip();
    }
}
