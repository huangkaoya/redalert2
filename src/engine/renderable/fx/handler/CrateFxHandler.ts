import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
}
interface CratePickupEvent {
    target: {
        animName: string;
    };
    tile: {
        rx: number;
        ry: number;
        z: number;
    };
}
export class CrateFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.CratePickup, (event: CratePickupEvent) => {
            const animName = event.target.animName;
            if (animName) {
                this.renderableManager.createTransientAnim(animName, (anim) => {
                    anim.setPosition(Coords.tile3dToWorld(event.tile.rx, event.tile.ry, event.tile.z + 1));
                    anim.setRenderOrder(1e6);
                });
            }
        }));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
