import { ObjectType } from '@/engine/type/ObjectType';
import { DeathType } from '@/game/gameobject/common/DeathType';
import { NotifyCrash } from '@/game/gameobject/trait/interface/NotifyCrash';
import { NotifyDestroy } from '@/game/gameobject/trait/interface/NotifyDestroy';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class SpawnDebrisTrait {
    [NotifyCrash.onCrash](gameObject: GameObject, world: World): void {
        this.handleDestroy(gameObject, world);
    }
    [NotifyDestroy.onDestroy](gameObject: GameObject, world: World, context?: any): void {
        if (!context?.weapon?.warhead.rules.temporal &&
            !gameObject.isCrashing &&
            gameObject.deathType !== DeathType.Sink &&
            gameObject.isSpawned) {
            this.handleDestroy(gameObject, world);
        }
    }
    private handleDestroy(gameObject: GameObject, world: World): void {
        if (gameObject.isVehicle() || gameObject.isBuilding() || gameObject.isOverlay()) {
            const minDebris = gameObject.isOverlay() ? 0 : gameObject.rules.minDebris;
            const maxDebris = gameObject.isOverlay()
                ? world.rules.general.bridgeVoxelMax
                : gameObject.rules.maxDebris;
            const debrisCount = world.generateRandomInt(minDebris, maxDebris);
            if (debrisCount > 0) {
                this.spawnDebris(gameObject, world, debrisCount);
            }
        }
    }
    private spawnDebris(gameObject: GameObject, world: World, count: number): void {
        const position = gameObject.position.getMapPosition();
        if (world.map.isWithinHardBounds(position)) {
            let debrisTypes = gameObject.isOverlay()
                ? []
                : gameObject.isVehicle()
                    ? gameObject.rules.debrisTypes
                    : gameObject.rules.debrisAnims;
            if (!debrisTypes.length) {
                debrisTypes = world.rules.audioVisual.metallicDebris;
            }
            debrisTypes = debrisTypes.filter(type => world.rules.hasObject(type, ObjectType.VoxelAnim) ||
                world.art.hasObject(type, ObjectType.Animation));
            Array(count).fill(0)
                .map(() => debrisTypes[world.generateRandomInt(0, debrisTypes.length - 1)])
                .map(type => world.createObject(ObjectType.Debris, type))
                .forEach(debris => {
                debris.position.moveToLeptons(position);
                debris.position.tileElevation = gameObject.position.tileElevation;
                world.spawnObject(debris, debris.position.tile);
            });
        }
    }
}
