import { GameSpeed } from '@/game/GameSpeed';
import { NotifyTick } from '@/game/gameobject/trait/interface/NotifyTick';
import { NotifySpawn } from '@/game/gameobject/trait/interface/NotifySpawn';
import { Coords } from '@/game/Coords';
import { NotifyTileChange } from '@/game/gameobject/trait/interface/NotifyTileChange';
import { GameMath } from '@/game/math/GameMath';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class HoverBobTrait {
    private prevHoverBobLeptons: number = 0;
    private spawnTick: number = 0;
    [NotifySpawn.onSpawn](gameObject: GameObject, world: World): void {
        this.setBaseElevation(gameObject, world);
        this.spawnTick = world.currentTick;
    }
    [NotifyTileChange.onTileChange](gameObject: GameObject, world: World, oldTile: any, isTeleport: boolean): void {
        if (isTeleport) {
            this.prevHoverBobLeptons = 0;
            this.setBaseElevation(gameObject, world);
        }
    }
    private setBaseElevation(gameObject: GameObject, world: World): void {
        gameObject.position.tileElevation =
            (gameObject.onBridge
                ? world.map.tileOccupation.getBridgeOnTile(gameObject.tile)?.tileElevation ?? 0
                : 0) +
                Coords.worldToTileHeight(world.rules.general.hover.height);
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        const hoverBobLeptons = this.computeHoverBobLeptons(world.currentTick, world.rules.general.hover);
        const deltaLeptons = hoverBobLeptons - this.prevHoverBobLeptons;
        this.prevHoverBobLeptons = hoverBobLeptons;
        const worldHeight = Coords.tileHeightToWorld(gameObject.position.tileElevation);
        gameObject.position.tileElevation = Coords.worldToTileHeight(worldHeight + deltaLeptons);
    }
    private computeHoverBobLeptons(currentTick: number, hoverRules: any): number {
        const timeInSeconds = (currentTick - this.spawnTick) /
            GameSpeed.BASE_TICKS_PER_SECOND /
            (60 * hoverRules.bob);
        return 0.1 * hoverRules.height * GameMath.sin(2 * timeInSeconds * Math.PI);
    }
}
