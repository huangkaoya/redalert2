import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { getRandomInt } from '@/util/math';
import { LightningStormFx } from '@/engine/gfx/lighting/LightningStormFx';
import { GameSpeed } from '@/game/GameSpeed';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';
import { Coords } from '@/game/Coords';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
    rules: {
        audioVisual: {
            weatherConClouds: string[];
            ironCurtainInvokeAnim: string;
            chronoBlast: string;
            chronoBlastDest: string;
            chronoPlacement: string;
        };
        general: {
            lightningStorm: {
                duration: number;
            };
        };
    };
    map: {
        tileOccupation: {
            getBridgeOnTile: (tile: Tile) => Bridge | undefined;
        };
        getIonLighting: () => any;
    };
}
interface Tile {
    rx: number;
    ry: number;
    z: number;
}
interface Bridge {
    tileElevation: number;
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
    createAnim: (name: string, callback: (anim: any) => void) => any;
    getRenderableContainer: () => {
        remove: (anim: any) => void;
    } | undefined;
}
interface LightingDirector {
    addEffect: (effect: any) => void;
}
interface LightningStormEvent {
    position: any;
}
interface SuperWeaponActivateEvent {
    target: SuperWeaponType;
    atTile: Tile;
    atTile2?: Tile;
}
export class SuperWeaponFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private lightingDirector: LightingDirector;
    private disposables: CompositeDisposable;
    private lightingFx?: LightningStormFx;
    private chronoSphereAnim?: any;
    constructor(game: Game, renderableManager: RenderableManager, lightingDirector: LightingDirector) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.lightingDirector = lightingDirector;
        this.disposables = new CompositeDisposable();
    }
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.LightningStormCloud, (event: LightningStormEvent) => {
            const clouds = this.game.rules.audioVisual.weatherConClouds;
            const cloudAnim = clouds[getRandomInt(0, clouds.length - 1)];
            const anim = this.renderableManager.createTransientAnim(cloudAnim, (anim) => {
                anim.setPosition(event.position);
            });
            this.lightingFx?.waitForCloudAnim(anim);
        }), this.game.events.subscribe(EventType.LightningStormManifest, () => {
            const fx = new LightningStormFx(this.game.rules.general.lightningStorm.duration / GameSpeed.BASE_TICKS_PER_SECOND, this.game.map.getIonLighting());
            this.lightingFx = fx;
            this.lightingDirector.addEffect(fx);
        }), this.game.events.subscribe(EventType.SuperWeaponActivate, (event: SuperWeaponActivateEvent) => {
            const weaponType = event.target;
            if (weaponType === SuperWeaponType.IronCurtain) {
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.ironCurtainInvokeAnim, (anim) => {
                    const pos = Coords.tile3dToWorld(event.atTile.rx + 0.5, event.atTile.ry + 0.5, event.atTile.z);
                    anim.setPosition(pos);
                });
            }
            else if (weaponType === SuperWeaponType.ChronoSphere) {
                this.disposeChronoSphereAnim();
                const sourceElevation = this.game.map.tileOccupation.getBridgeOnTile(event.atTile)?.tileElevation ?? 0;
                const sourcePos = Coords.tile3dToWorld(event.atTile.rx + 0.5, event.atTile.ry + 0.5, event.atTile.z + sourceElevation);
                const destTile = event.atTile2;
                const destElevation = this.game.map.tileOccupation.getBridgeOnTile(destTile)?.tileElevation ?? 0;
                const destPos = Coords.tile3dToWorld(destTile.rx + 0.5, destTile.ry + 0.5, destTile.z + destElevation);
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.chronoBlast, (anim) => {
                    anim.setPosition(sourcePos);
                });
                this.renderableManager.createTransientAnim(this.game.rules.audioVisual.chronoBlastDest, (anim) => {
                    anim.setPosition(destPos);
                });
            }
        }));
    }
    createChronoSphereAnim(tile: Tile): void {
        this.chronoSphereAnim = this.renderableManager.createAnim(this.game.rules.audioVisual.chronoPlacement, (anim) => {
            const elevation = this.game.map.tileOccupation.getBridgeOnTile(tile)?.tileElevation ?? 0;
            const pos = Coords.tile3dToWorld(tile.rx + 0.5, tile.ry + 0.5, tile.z + elevation);
            anim.setPosition(pos);
        });
    }
    disposeChronoSphereAnim(): void {
        const anim = this.chronoSphereAnim;
        if (anim) {
            this.renderableManager.getRenderableContainer()?.remove(anim);
            anim.dispose();
        }
    }
    dispose(): void {
        this.lightingFx = undefined;
        this.disposeChronoSphereAnim();
        this.disposables.dispose();
    }
}
