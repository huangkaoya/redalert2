import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
import { EventType } from '@/game/event/EventType';
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
interface TriggerAnimEvent {
    type: EventType;
    name: string;
    tile: {
        rx: number;
        ry: number;
        z: number;
    };
}
export class TriggerActionFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
        this.handleEvent = (event: TriggerAnimEvent) => {
            switch (event.type) {
                case EventType.TriggerAnim: {
                    const animName = event.name;
                    this.renderableManager.createTransientAnim(animName, (anim) => {
                        const position = Coords.tile3dToWorld(event.tile.rx + 0.5, event.tile.ry + 0.5, event.tile.z);
                        anim.setPosition(position);
                    });
                    break;
                }
            }
        };
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(this.handleEvent));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
