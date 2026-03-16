import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
import { DeathType } from '@/game/gameobject/common/DeathType';
import * as THREE from 'three';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
    rules: {
        audioVisual: {
            warpOut: string;
            warpAway: string;
        };
    };
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
}
interface GameObject {
    position: {
        getTileOffset: () => THREE.Vector2;
    };
    tile: {
        rx: number;
        ry: number;
        z: number;
    };
    centerTile?: {
        rx: number;
        ry: number;
        z: number;
    };
    isBuilding: () => boolean;
    deathType: DeathType;
}
interface TeleportEvent {
    isChronoshift: boolean;
    target: GameObject;
    prevTile: {
        rx: number;
        ry: number;
        z: number;
    };
}
interface DestroyEvent {
    target: GameObject;
}
export class ChronoFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    private handleObjectTeleport: (event: TeleportEvent) => void;
    private handleObjectDestroy: (event: DestroyEvent) => void;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
        this.handleObjectTeleport = (event: TeleportEvent) => {
            if (event.isChronoshift) {
                const offset = event.target.position
                    .getTileOffset()
                    .multiplyScalar(1 / Coords.LEPTONS_PER_TILE);
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.warpOut, (anim) => {
                    anim.setPosition(Coords.tile3dToWorld(event.prevTile.rx + offset.x, event.prevTile.ry + offset.y, event.prevTile.z));
                });
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.warpOut, (anim) => {
                    const tile = event.target.tile;
                    anim.setPosition(Coords.tile3dToWorld(tile.rx + offset.x, tile.ry + offset.y, tile.z));
                });
            }
        };
        this.handleObjectDestroy = (event: DestroyEvent) => {
            if (event.target.deathType === DeathType.Temporal) {
                const tile = event.target.isBuilding()
                    ? event.target.centerTile!
                    : event.target.tile;
                const offset = event.target.isBuilding()
                    ? new THREE.Vector2(0.5, 0.5)
                    : event.target.position
                        .getTileOffset()
                        .multiplyScalar(1 / Coords.LEPTONS_PER_TILE);
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.warpAway, (anim) => {
                    anim.setPosition(Coords.tile3dToWorld(tile.rx + offset.x, tile.ry + offset.y, tile.z));
                });
            }
        };
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.ObjectTeleport, this.handleObjectTeleport), this.game.events.subscribe(EventType.ObjectDestroy, this.handleObjectDestroy));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
