import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { Coords } from '@/game/Coords';
import { SoundKey } from '@/engine/sound/SoundKey';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
    alliances: {
        areAllied: (player1: Player, player2: Player) => boolean;
    };
    map: {
        tileOccupation: {
            getBridgeOnTile: (tile: Tile) => Bridge | undefined;
        };
    };
}
interface Player {
    isObserver: boolean;
    color: any;
}
interface Tile {
    rx: number;
    ry: number;
    z: number;
    onBridgeLandType: boolean;
}
interface Bridge {
    tileElevation: number;
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
}
interface Renderer {
    onFrame: {
        subscribe: (handler: (time: number) => void) => {
            unsubscribe: (handler: (time: number) => void) => void;
        };
    };
}
interface WorldSound {
    playEffect: (sound: SoundKey, position: any, player: Player) => void;
}
interface Beacon {
    tile: Tile;
    anim: any;
    startTime?: number;
}
export class BeaconFxHandler {
    private game: Game;
    private localPlayer: {
        value: Player;
    };
    private renderableManager: RenderableManager;
    private renderer: Renderer;
    private worldSound: WorldSound;
    private disposables: CompositeDisposable;
    private beacons: Map<Player, Beacon[]>;
    private now?: number;
    constructor(game: Game, localPlayer: {
        value: Player;
    }, renderableManager: RenderableManager, renderer: Renderer, worldSound: WorldSound) {
        this.game = game;
        this.localPlayer = localPlayer;
        this.renderableManager = renderableManager;
        this.renderer = renderer;
        this.worldSound = worldSound;
        this.disposables = new CompositeDisposable();
        this.beacons = new Map();
    }
    private handlePingEvent = (event: {
        player: Player;
        tile: Tile;
    }) => {
        const localPlayer = this.localPlayer.value;
        if ((!localPlayer ||
            localPlayer.isObserver ||
            event.player === localPlayer ||
            this.game.alliances.areAllied(event.player, localPlayer)) &&
            this.canPingLocation(event.player, event.tile)) {
            let beacons = this.beacons.get(event.player);
            if (!beacons) {
                beacons = [];
                this.beacons.set(event.player, beacons);
            }
            let existingBeacon = beacons.find((b) => b.tile === event.tile);
            const bridge = event.tile.onBridgeLandType
                ? this.game.map.tileOccupation.getBridgeOnTile(event.tile)
                : undefined;
            const position = Coords.tile3dToWorld(event.tile.rx + 0.5, event.tile.ry + 0.5, event.tile.z + (bridge?.tileElevation ?? 0));
            this.worldSound.playEffect(SoundKey.PlaceBeaconSound, position, event.player);
            if (existingBeacon) {
                existingBeacon.startTime = this.now;
            }
            else {
                const anim = this.renderableManager.createTransientAnim("PBEACON", (anim: any) => {
                    anim.setPosition(position);
                    anim.setRenderOrder(1000000);
                    anim.remapColor(event.player.color);
                    anim.create3DObject();
                });
                beacons.push({
                    tile: event.tile,
                    anim,
                    startTime: this.now,
                });
            }
        }
    };
    private handleFrame = (time: number) => {
        this.now = time;
        for (const beacons of this.beacons.values()) {
            for (const beacon of beacons.slice()) {
                if (beacon.startTime === undefined) {
                    beacon.startTime = time;
                }
                else if (time > beacon.startTime + 7000) {
                    beacon.anim.endAnimationLoop();
                    const index = beacons.indexOf(beacon);
                    if (index === -1) {
                        throw new Error("Beacon not found in array");
                    }
                    beacons.splice(index, 1);
                }
            }
        }
    };
    init(): void {
        this.disposables.add(this.game.events.subscribe(EventType.PingLocation, this.handlePingEvent));
        this.renderer.onFrame.subscribe(this.handleFrame);
        this.disposables.add(() => this.renderer.onFrame.unsubscribe(this.handleFrame));
    }
    canPingLocation(player: Player, tile: Tile): boolean {
        const beacons = this.beacons.get(player) ?? [];
        const lastPingTime = beacons.reduce((max, beacon) => Math.max(max, beacon.startTime ?? 0), 0);
        return ((beacons.length < 3 || beacons.some((b) => b.tile === tile)) &&
            (!this.now || this.now - lastPingTime >= 1000 / 3));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
