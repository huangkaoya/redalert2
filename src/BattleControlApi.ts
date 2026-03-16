declare const THREE: any;
interface WorldInteraction {
    customScrollHandler: {
        requestScroll(vector: any): void;
        cancel(): void;
    };
    keyboardHandler: {
        executeCommand(command: string): void;
    };
    applyKeyModifiers(modifiers: any): void;
}
type ToggleCallback = (value: any) => void;
export class BattleControlApi {
    private _toggleCallbacks = new Set<ToggleCallback>();
    private _worldInteraction?: WorldInteraction;
    constructor() {
    }
    _setWorldInteraction(worldInteraction: WorldInteraction): void {
        this._worldInteraction = worldInteraction;
    }
    _notifyToggle(value: any): void {
        for (const callback of this._toggleCallbacks) {
            try {
                callback(value);
            }
            catch (error) {
                console.error(error);
            }
        }
    }
    onToggle(callback: ToggleCallback): () => void {
        this._toggleCallbacks.add(callback);
        return () => {
            this._toggleCallbacks.delete(callback);
        };
    }
    requestPan(x: number, y: number): void {
        const vector = new THREE.Vector2(x, y);
        this._worldInteraction?.customScrollHandler.requestScroll(vector);
    }
    cancelPan(): void {
        this._worldInteraction?.customScrollHandler.cancel();
    }
    executeKeyCommand(command: string): void {
        this._worldInteraction?.keyboardHandler.executeCommand(command);
    }
    applyKeyModifiers(modifiers: any): void {
        this._worldInteraction?.applyKeyModifiers(modifiers);
    }
}
