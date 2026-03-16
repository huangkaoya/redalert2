import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
import { getRandomInt } from '@/util/math';
import * as THREE from 'three';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
    rules: {
        audioVisual: {
            weatherConBolts: string[];
        };
    };
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
}
interface WarheadDetonateEvent {
    explodeAnim?: string;
    position: THREE.Vector3;
    target: {
        rules: {
            bullets?: boolean;
        };
    };
    isLightningStrike?: boolean;
}
export class WarheadDetonateFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    private handleWarheadDetonation: (event: WarheadDetonateEvent) => void;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
        this.handleWarheadDetonation = (event: WarheadDetonateEvent) => {
            let explodeAnim = event.explodeAnim;
            if (explodeAnim) {
                this.renderableManager.createTransientAnim(explodeAnim, (anim) => {
                    let position = event.position.clone();
                    if (event.target.rules.bullets) {
                        const offset = Coords.getWorldTileSize() / 8;
                        position = new THREE.Vector3(getRandomInt(-offset, offset), 0, getRandomInt(-offset, offset)).add(position);
                    }
                    anim.setPosition(position);
                });
            }
            if (event.isLightningStrike) {
                const bolts = this.game.rules.audioVisual.weatherConBolts;
                explodeAnim = bolts[getRandomInt(0, bolts.length - 1)];
                this.renderableManager.createTransientAnim(explodeAnim, (anim) => {
                    anim.setPosition(event.position);
                });
            }
        };
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.WarheadDetonate, this.handleWarheadDetonation));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
