import { rectContainsPoint } from '@/util/geometry';
import { PointerType } from '@/engine/type/PointerType';
import { ActionFilter } from './DefaultActionHandler';
import { isMacFirefox } from '@/util/userAgent';
export class WorldInteraction {
    private initialized = false;
    private enabled = true;
    private currentMode?: any;
    private clearModeOnSelectionChange = false;
    private clickOrigin = { x: 0, y: 0 };
    private maybePan = false;
    private hasDragged = false;
    private mousePressed?: number;
    private queuedMouseMoveEvent?: any;
    private isMinimapHover = false;
    private minimapHoverTile?: any;
    private minimapDragButton?: number;
    private suppressNextMinimapClick = false;
    private lastSelectionHash?: number;
    private lastDefaultActionUpdate?: number;
    private lastFrameTime?: number;
    private lastMouseDownEvent?: any;
    private lastDefaultModeClickDetails?: any;
    private lastKeyboardEvent?: KeyboardEvent;
    private lastKeyMods?: KeyboardEvent;
    private hasFaultyCtrlLeftClick = false;
    public chatTypingHandler?: any;
    constructor(private readonly worldScene: any, private readonly pointer: any, private readonly pointerEvents: any, private readonly cameraPanHandler: any, private readonly mapScrollHandler: any, private readonly mapHoverHandler: any, private readonly tooltipHandler: any, public readonly entityIntersectHelper: any, public readonly unitSelectionHandler: any, public readonly defaultActionHandler: any, public readonly keyboardHandler: any, public readonly arrowScrollHandler: any, public readonly customScrollHandler: any, public readonly minimapHandler: any, private readonly cameraZoom: any, private readonly document: Document, private readonly renderer: any, public readonly targetLines: any, private readonly rightClickMove: any, private readonly rightClickScroll: any, private readonly battleControlApi: any) { }
    init(): void {
        if (this.initialized) {
            return;
        }
        this.setupHandlers();
        this.worldScene.add(this.targetLines);
        this.initialized = true;
        this.hasFaultyCtrlLeftClick = isMacFirefox();
        this.battleControlApi?._setWorldInteraction(this);
        this.battleControlApi?._notifyToggle(true);
    }
    setShroud(shroud: any): void {
        this.mapHoverHandler.setShroud(shroud);
        this.minimapHandler.setShroud(shroud);
    }
    private setupHandlers(): void {
        this.pointerEvents.addEventListener('canvas', 'mousemove', this.handleMouseMove);
        this.pointerEvents.addEventListener('canvas', 'mousedown', this.handleMouseDown);
        this.pointerEvents.addEventListener('canvas', 'mouseup', this.handleMouseUp);
        this.pointerEvents.addEventListener('canvas', 'wheel', this.handleWheel);
        this.document.addEventListener('keydown', this.handleKeyDown);
        this.document.addEventListener('keyup', this.handleKeyUp);
        this.mapHoverHandler.onHoverChange.subscribe(this.handleMapHoverChange);
        this.renderer.onFrame.subscribe(this.handleFrame);
        this.unitSelectionHandler.onUserSelectionChange.subscribe(this.handleSelectionChange);
        this.minimapHandler.minimap.onClick.subscribe(this.handleMinimapClick);
        this.minimapHandler.minimap.onRightClick.subscribe(this.handleMinimapRightClick);
        this.minimapHandler.minimap.onMouseOver.subscribe(this.handleMinimapMouseOver);
        this.minimapHandler.minimap.onMouseMove.subscribe(this.handleMinimapMouseMove);
        this.minimapHandler.minimap.onMouseOut.subscribe(this.handleMinimapMouseOut);
        this.tooltipHandler.init();
    }
    private teardownHandlers(): void {
        this.pointerEvents.removeEventListener('canvas', 'mousemove', this.handleMouseMove);
        this.pointerEvents.removeEventListener('canvas', 'mousedown', this.handleMouseDown);
        this.pointerEvents.removeEventListener('canvas', 'mouseup', this.handleMouseUp);
        this.pointerEvents.removeEventListener('canvas', 'wheel', this.handleWheel);
        this.document.removeEventListener('keydown', this.handleKeyDown);
        this.document.removeEventListener('keyup', this.handleKeyUp);
        this.mapHoverHandler.onHoverChange.unsubscribe(this.handleMapHoverChange);
        this.renderer.onFrame.unsubscribe(this.handleFrame);
        this.unitSelectionHandler.onUserSelectionChange.unsubscribe(this.handleSelectionChange);
        this.unitSelectionHandler.cancelBoxSelect();
        this.minimapHandler.minimap.onClick.unsubscribe(this.handleMinimapClick);
        this.minimapHandler.minimap.onRightClick.unsubscribe(this.handleMinimapRightClick);
        this.minimapHandler.minimap.onMouseOver.unsubscribe(this.handleMinimapMouseOver);
        this.minimapHandler.minimap.onMouseMove.unsubscribe(this.handleMinimapMouseMove);
        this.minimapHandler.minimap.onMouseOut.unsubscribe(this.handleMinimapMouseOut);
        this.tooltipHandler.dispose();
        this.mapScrollHandler.cancel();
        this.arrowScrollHandler.cancel();
        this.customScrollHandler.cancel();
    }
    dispose(): void {
        if (this.initialized && this.enabled) {
            this.teardownHandlers();
            this.pointer.setPointerType(PointerType.Default);
            this.battleControlApi?._setWorldInteraction(undefined);
            this.battleControlApi?._notifyToggle(false);
        }
        this.currentMode?.dispose?.();
        this.mapScrollHandler.dispose();
        this.cameraPanHandler.dispose();
        this.mapHoverHandler.dispose();
        this.unitSelectionHandler.dispose();
        this.chatTypingHandler?.dispose?.();
        this.keyboardHandler.dispose();
        this.worldScene.remove(this.targetLines);
        this.targetLines.dispose?.();
        this.tooltipHandler.dispose();
    }
    setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) {
            return;
        }
        this.enabled = enabled;
        if (enabled) {
            this.setupHandlers();
        }
        else {
            this.teardownHandlers();
            this.cancelMouseUp();
            this.cancelKeyUp();
            this.pointer.setPointerType(PointerType.Default);
            this.chatTypingHandler?.endTyping?.();
        }
        this.battleControlApi?._setWorldInteraction(enabled ? this : undefined);
        this.battleControlApi?._notifyToggle(enabled);
    }
    isEnabled(): boolean {
        return this.enabled;
    }
    pausePanning(): void {
        this.cameraPanHandler.setPaused(true);
        this.mapScrollHandler.setPaused(true);
    }
    unpausePanning(): void {
        this.cameraPanHandler.setPaused(false);
        this.mapScrollHandler.setPaused(false);
    }
    setMode(mode: any): void {
        if (this.currentMode !== mode) {
            this.currentMode?.cancel?.();
            this.pointer.setPointerType(PointerType.Default);
        }
        this.currentMode = mode;
        this.clearModeOnSelectionChange = false;
        if (mode) {
            this.unitSelectionHandler.cancelBoxSelect();
            this.unitSelectionHandler.deselectAll();
            this.clearModeOnSelectionChange = true;
            mode.enter();
            this.mapHoverHandler.update(this.pointer.getPosition(), true);
            const hover = this.getCurrentHover();
            if (hover) {
                mode.hover(hover, this.isMinimapHover);
            }
        }
    }
    getMode(): any {
        return this.currentMode;
    }
    getLastKeyModifiers(): KeyboardEvent | undefined {
        return this.lastKeyMods;
    }
    registerKeyCommand(type: string, command: any): this {
        this.keyboardHandler.registerCommand(type, command);
        return this;
    }
    unregisterKeyCommand(type: string): this {
        this.keyboardHandler.unregisterCommand(type);
        return this;
    }
    applyKeyModifiers(modifiers: any): void {
        this.lastKeyMods = modifiers;
        if (!this.currentMode && !(this.maybePan && this.hasDragged) && !this.mapScrollHandler.isScrolling()) {
            this.updateDefaultAction(this.getCurrentHover(), this.unitSelectionHandler.getSelectedUnits(), modifiers);
        }
    }
    private updateDefaultAction(hover: any, selection: any[], keyboardEvent: any): void {
        const scrolling = this.mapScrollHandler.isScrolling();
        if (hover) {
            this.defaultActionHandler.update(hover, selection, this.isRightClickMove(), keyboardEvent, this.isMinimapHover);
            if (!scrolling) {
                this.pointer.setPointerType(this.defaultActionHandler.getPointerType(this.isMinimapHover));
            }
        }
        else if (!scrolling) {
            this.pointer.setPointerType(this.isMinimapHover ? PointerType.Mini : PointerType.Default);
        }
        this.lastDefaultActionUpdate = this.lastFrameTime;
    }
    private readonly handleSelectionChange = (): void => {
        if (this.clearModeOnSelectionChange) {
            this.setMode(undefined);
        }
    };
    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        this.handleKeyModifierChange(event);
        this.keyboardHandler.handleKeyDown(event);
        this.arrowScrollHandler.handleKeyDown(event);
        this.chatTypingHandler?.handleKeyDown?.(event);
    };
    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        this.handleKeyModifierChange(event);
        this.keyboardHandler.handleKeyUp(event);
        this.arrowScrollHandler.handleKeyUp(event);
        this.chatTypingHandler?.handleKeyUp?.(event);
        this.tooltipHandler.reset();
    };
    private handleKeyModifierChange(event: KeyboardEvent): void {
        const previous = this.lastKeyMods;
        this.lastKeyMods = event;
        this.lastKeyboardEvent = event;
        if (this.currentMode ||
            (this.maybePan && this.hasDragged) ||
            this.mapScrollHandler.isScrolling() ||
            event.repeat ||
            (event.shiftKey === previous?.shiftKey && event.ctrlKey === previous?.ctrlKey && event.altKey === previous?.altKey)) {
            return;
        }
        this.updateDefaultAction(this.getCurrentHover(), this.unitSelectionHandler.getSelectedUnits(), event);
    }
    private readonly handleMapHoverChange = (hover: any): void => {
        this.currentMode?.hover?.(hover, this.isMinimapHover);
        if (!this.isMinimapHover && !this.currentMode) {
            this.updateDefaultAction(hover, this.unitSelectionHandler.getSelectedUnits(), this.lastKeyMods);
        }
    };
    private readonly handleMouseMove = (event: any): void => {
        this.queuedMouseMoveEvent = event;
    };
    private readonly handleFrame = (time: number): void => {
        this.lastFrameTime = time;
        let shouldRefreshDefaultAction = false;
        const selectionHash = this.unitSelectionHandler.getHash();
        if (selectionHash !== this.lastSelectionHash && !this.currentMode) {
            this.lastSelectionHash = selectionHash;
            shouldRefreshDefaultAction = true;
        }
        if (this.queuedMouseMoveEvent) {
            const event = this.queuedMouseMoveEvent;
            this.queuedMouseMoveEvent = undefined;
            this.processMouseMove(event);
        }
        if ((this.lastDefaultActionUpdate === undefined || time - this.lastDefaultActionUpdate >= 1000 / 15) &&
            !this.currentMode &&
            !this.mapScrollHandler.isScrolling() &&
            !(this.hasDragged && this.maybePan)) {
            shouldRefreshDefaultAction = true;
        }
        if (shouldRefreshDefaultAction) {
            this.updateDefaultAction(this.getCurrentHover(), this.unitSelectionHandler.getSelectedUnits(), this.lastKeyMods);
        }
    };
    private readonly handleMouseDown = (event: any): void => {
        if (!rectContainsPoint(this.worldScene.viewport, event.pointer) || this.mousePressed !== undefined) {
            return;
        }
        if (this.hasFaultyCtrlLeftClick && event.ctrlKey && event.button === 2) {
            event.button = 0;
        }
        this.mapScrollHandler.cancel();
        if (event.button === 0 &&
            this.isMinimapHover &&
            this.minimapHandler.isTileWithinViewport(this.minimapHoverTile)) {
            this.clickOrigin = event.pointer;
            this.mousePressed = event.button;
            this.lastMouseDownEvent = event;
            this.hasDragged = false;
            this.minimapDragButton = event.button;
            this.pointer.setPointerType(PointerType.Mini);
            return;
        }
        this.pointerEvents.intersectionsEnabled = false;
        this.clickOrigin = event.pointer;
        this.mousePressed = event.button;
        this.lastMouseDownEvent = event;
        this.hasDragged = false;
        if ((event.button === 2 && this.isRightClickPanAllowed()) || event.button === 1) {
            this.maybePan = true;
            this.cameraPanHandler.start(event.pointer);
        }
        if (event.button === 2) {
            if (!this.isRightClickPanAllowed() && !this.isRightClickMove()) {
                this.unitSelectionHandler.deselectAll();
            }
            this.chatTypingHandler?.endTyping?.();
        }
    };
    private readonly handleMouseUp = (event: any): void => {
        if (this.hasFaultyCtrlLeftClick && event.ctrlKey && event.button === 2) {
            event.button = 0;
        }
        if (this.mousePressed !== event.button) {
            return;
        }
        if (this.minimapDragButton === event.button) {
            this.mousePressed = undefined;
            this.lastMouseDownEvent = undefined;
            this.suppressNextMinimapClick = this.hasDragged;
            this.hasDragged = false;
            this.minimapDragButton = undefined;
            this.pointer.setPointerType(this.isMinimapHover ? PointerType.Mini : PointerType.Default);
            return;
        }
        if (event.isTouch && this.lastKeyMods && this.lastKeyMods !== this.lastKeyboardEvent) {
            event.ctrlKey = this.lastKeyMods.ctrlKey;
            event.shiftKey = this.lastKeyMods.shiftKey;
            event.altKey = this.lastKeyMods.altKey;
        }
        this.pointerEvents.intersectionsEnabled = true;
        this.mousePressed = undefined;
        const wasPanning = this.maybePan;
        this.maybePan = false;
        if (wasPanning) {
            this.cameraPanHandler.finish();
        }
        if (wasPanning && this.hasDragged) {
            this.mapHoverHandler.update(event.pointer, true);
            this.currentMode?.hover?.(this.getCurrentHover(), this.isMinimapHover);
            return;
        }
        if (this.currentMode) {
            if (event.button === 0) {
                this.mapHoverHandler.update(event.pointer, true);
                if (this.currentMode.execute(this.getCurrentHover(), this.isMinimapHover) !== false) {
                    this.currentMode = undefined;
                }
            }
            else if (event.button === 2 && this.isClickRange(event.pointer)) {
                this.currentMode.cancel?.();
                this.currentMode = undefined;
                this.pointer.setPointerType(PointerType.Default);
            }
            return;
        }
        let boxSelectionHandled = false;
        if (event.button === 0 && this.hasDragged) {
            boxSelectionHandled = this.unitSelectionHandler.finishBoxSelect(event.pointer, !event.shiftKey);
            if (!boxSelectionHandled) {
                this.mapHoverHandler.update(event.pointer, true);
            }
        }
        if (event.button !== 0 && event.button !== 2) {
            return;
        }
        const rightClickMove = this.isRightClickMove();
        const executeDefaultClick = event.button === (rightClickMove ? 2 : 0);
        const isClick = this.isClickRange(event.pointer);
        let isDoubleSameClick = false;
        const isTouchLongPress = isClick && event.isTouch && event.timeStamp - this.lastMouseDownEvent.timeStamp >= 500;
        if (event.isTouch) {
            this.mapHoverHandler.update(event.pointer, true);
        }
        const hover = this.mapHoverHandler.getCurrentHover();
        if (isClick) {
            const lastClick = this.lastDefaultModeClickDetails;
            const currentClick = {
                mouseUpEvent: event,
                hoverObject: hover?.gameObject,
                selectionHash: this.unitSelectionHandler.getHash(),
                time: Date.now(),
            };
            if (lastClick) {
                isDoubleSameClick =
                    currentClick.mouseUpEvent.button === lastClick.mouseUpEvent.button &&
                        currentClick.hoverObject === lastClick.hoverObject &&
                        currentClick.selectionHash === lastClick.selectionHash &&
                        currentClick.time - lastClick.time < 500;
            }
            this.lastDefaultModeClickDetails = isDoubleSameClick ? undefined : currentClick;
        }
        if (!executeDefaultClick && (!rightClickMove || !event.shiftKey || event.ctrlKey) && (!rightClickMove || !isDoubleSameClick)) {
            if (!isClick) {
                return;
            }
            this.unitSelectionHandler.deselectAll();
        }
        if (!boxSelectionHandled && (rightClickMove ? executeDefaultClick : executeDefaultClick || event.button === 0)) {
            this.handleDefaultClickAction(rightClickMove, executeDefaultClick, isDoubleSameClick, isTouchLongPress, event, hover);
            if (this.lastDefaultModeClickDetails) {
                this.lastDefaultModeClickDetails.selectionHash = this.unitSelectionHandler.getHash();
            }
        }
    };
    private readonly handleWheel = (event: any): void => {
        this.cameraZoom.applyStep(event.wheelDeltaY > 0 ? -0.1 : 0.1);
    };
    private readonly handleMinimapClick = (tile: any): void => {
        if (this.suppressNextMinimapClick) {
            this.suppressNextMinimapClick = false;
            return;
        }
        this.executeMinimapClickCommand(tile, false);
    };
    private readonly handleMinimapRightClick = (tile: any): void => {
        this.executeMinimapClickCommand(tile, true);
    };
    private readonly handleMinimapMouseOver = (): void => {
        this.isMinimapHover = true;
    };
    private readonly handleMinimapMouseMove = (tile: any): void => {
        this.minimapHoverTile = tile;
        if (this.minimapDragButton === 0) {
            if (!this.hasDragged && !this.isClickRange(this.pointer.getPosition())) {
                this.hasDragged = true;
            }
            this.minimapHandler.panToTile(tile);
            this.pointer.setPointerType(PointerType.Mini);
            return;
        }
        const hover = this.minimapHandler.getHover(tile);
        if (this.currentMode) {
            this.currentMode.hover(hover, true);
        }
        else {
            this.updateDefaultAction(hover, this.unitSelectionHandler.getSelectedUnits(), this.lastKeyMods);
        }
    };
    private readonly handleMinimapMouseOut = (): void => {
        if (this.minimapDragButton !== undefined) {
            return;
        }
        this.pointer.setPointerType(PointerType.Default);
        this.isMinimapHover = false;
        this.minimapHoverTile = undefined;
    };
    private processMouseMove(event: any): void {
        if (this.minimapDragButton !== undefined) {
            if (!this.hasDragged && !this.isClickRange(event.pointer)) {
                this.hasDragged = true;
            }
            return;
        }
        const scrolling = this.mapScrollHandler.isScrolling();
        if (this.mousePressed === undefined) {
            if (!event.isTouch) {
                this.mapScrollHandler.update(event.pointer);
            }
        }
        else if (!this.hasDragged && !this.isClickRange(event.pointer)) {
            this.hasDragged = true;
            if (!this.currentMode && this.mousePressed === 0) {
                this.unitSelectionHandler.startBoxSelect(this.clickOrigin);
            }
        }
        if (this.currentMode &&
            !this.mapScrollHandler.isScrolling() &&
            !(this.maybePan && this.hasDragged)) {
            if (!this.isMinimapHover && scrolling) {
                this.pointer.setPointerType(PointerType.Default);
            }
            this.mapHoverHandler.update(event.pointer);
            this.currentMode.hover(this.getCurrentHover(), this.isMinimapHover);
        }
        if (this.mousePressed === undefined) {
            if (!this.mapScrollHandler.isScrolling()) {
                this.mapHoverHandler.update(event.pointer);
                if (!this.currentMode) {
                    this.updateDefaultAction(this.getCurrentHover(), this.unitSelectionHandler.getSelectedUnits(), event);
                }
            }
            return;
        }
        if (!this.hasDragged ||
            (((this.currentMode || (this.isRightClickMove() && this.mousePressed === 2)) && !this.maybePan))) {
            this.mapHoverHandler.update(event.pointer);
        }
        else {
            this.mapHoverHandler.finish();
        }
        if (!this.hasDragged) {
            return;
        }
        if (this.maybePan) {
            this.cameraPanHandler.update(event.pointer, event.isTouch);
            return;
        }
        if (!this.currentMode && !(this.isRightClickMove() && this.mousePressed === 2)) {
            this.pointer.setPointerType(PointerType.Default);
            this.unitSelectionHandler.updateBoxSelect(event.pointer);
        }
    }
    private handleDefaultClickAction(rightClickMove: boolean, executeDefaultClick: boolean, allowTypeSelect: boolean, touchForceAttack: boolean, event: any, hover: any): void {
        if (!hover) {
            return;
        }
        const selection = this.unitSelectionHandler.getSelectedUnits();
        const filter = rightClickMove
            ? executeDefaultClick
                ? ActionFilter.NoSelect
                : ActionFilter.SelectOnly
            : ActionFilter.All;
        this.defaultActionHandler.execute(hover, selection, filter, rightClickMove && !executeDefaultClick, allowTypeSelect, touchForceAttack ? { ...event, ctrlKey: true } : event);
    }
    private cancelMouseUp(): void {
        if (this.mousePressed === undefined) {
            return;
        }
        this.pointerEvents.intersectionsEnabled = true;
        this.mousePressed = undefined;
        this.minimapDragButton = undefined;
        this.suppressNextMinimapClick = false;
        if (this.maybePan) {
            this.maybePan = false;
            this.cameraPanHandler.finish();
        }
        if (this.currentMode) {
            this.currentMode.cancel?.();
            this.currentMode = undefined;
        }
        this.unitSelectionHandler.cancelBoxSelect();
    }
    private cancelKeyUp(): void {
        if (this.lastKeyboardEvent?.type !== 'keydown') {
            return;
        }
        const synthetic = new KeyboardEvent('keyup', {
            key: this.lastKeyboardEvent.key,
            keyCode: this.lastKeyboardEvent.keyCode,
            ctrlKey: this.lastKeyboardEvent.ctrlKey,
            altKey: this.lastKeyboardEvent.altKey,
            shiftKey: this.lastKeyboardEvent.shiftKey,
            metaKey: this.lastKeyboardEvent.metaKey,
        });
        this.handleKeyUp(synthetic);
    }
    private isClickRange(pointer: {
        x: number;
        y: number;
    }): boolean {
        return Math.abs(pointer.x - this.clickOrigin.x) <= 7 && Math.abs(pointer.y - this.clickOrigin.y) <= 7;
    }
    private isRightClickPanAllowed(): boolean {
        return this.rightClickScroll.value;
    }
    private isRightClickMove(): boolean {
        return this.rightClickMove.value;
    }
    private executeMinimapClickCommand(tile: any, rightClick: boolean): void {
        let handled = false;
        if (rightClick === this.isRightClickMove()) {
            const hover = this.minimapHandler.getHover(tile);
            if (this.currentMode) {
                if (this.currentMode.execute(hover, true) !== false) {
                    this.currentMode = undefined;
                    handled = true;
                }
            }
            else {
                const selection = this.unitSelectionHandler.getSelectedUnits();
                handled = this.defaultActionHandler.execute(hover, selection, ActionFilter.All, false, false, this.lastKeyMods, true);
            }
        }
        if (!handled) {
            this.minimapHandler.panToTile(tile);
        }
    }
    private getCurrentHover(): any {
        if (this.isMinimapHover) {
            return this.minimapHoverTile ? this.minimapHandler.getHover(this.minimapHoverTile) : undefined;
        }
        return this.mapHoverHandler.getCurrentHover();
    }
}
