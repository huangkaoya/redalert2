import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
import { GameSpeed } from '@/game/GameSpeed';
import { SparkFx } from '@/engine/renderable/fx/SparkFx';
import * as THREE from 'three';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
    speed: any;
}
interface RenderableManager {
    addEffect: (effect: any) => void;
}
interface GameObject {
    isVehicle: () => boolean;
    isAircraft: () => boolean;
    position: {
        worldPosition: THREE.Vector3;
    };
    parasiteableTrait?: {
        getParasite: () => GameObject;
    };
    healthTrait: {
        health: number;
    };
}
interface Attacker {
    obj?: GameObject;
}
interface DamageEvent {
    target: GameObject;
    attacker?: Attacker;
}
export class ParasiteSparkFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
        this.handleObjectDamaged = (event: DamageEvent) => {
            if ((event.target.isVehicle() || event.target.isAircraft()) &&
                event.attacker?.obj &&
                !event.attacker.obj.rules.organic &&
                event.target.parasiteableTrait?.getParasite() === event.attacker.obj &&
                event.target.healthTrait.health > 0) {
                const position = event.target.position.worldPosition.clone();
                position.y += Coords.tileHeightToWorld(0.5);
                const duration = 20 / GameSpeed.BASE_TICKS_PER_SECOND;
                const sparkFx = new SparkFx(position, new THREE.Color(1, 1, 1), duration, this.game.speed);
                this.renderableManager.addEffect(sparkFx);
            }
        };
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.InflictDamage, this.handleObjectDamaged));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
