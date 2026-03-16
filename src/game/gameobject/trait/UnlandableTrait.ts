import { Vector2 } from '@/game/math/Vector2';
import { bresenham } from '@/util/bresenham';
import { isNotNullOrUndefined } from '@/util/typeGuard';
import { MoveTask } from '@/game/gameobject/task/move/MoveTask';
import { CallbackTask } from '@/game/gameobject/task/system/CallbackTask';
import { TaskGroup } from '@/game/gameobject/task/system/TaskGroup';
import { NotifyTick } from './interface/NotifyTick';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class UnlandableTrait {
    private enabled: boolean = true;
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (!this.enabled)
            return;
        if (!gameObject.owner.isNeutral &&
            gameObject.name !== world.rules.general.paradrop.paradropPlane)
            return;
        if (!gameObject.unitOrderTrait.isIdle())
            return;
        const exitTile = this.chooseExitTile(gameObject.tile, world);
        gameObject.unitOrderTrait.addTask(new TaskGroup(new MoveTask(world, exitTile, false, { allowOutOfBoundsTarget: true }), new CallbackTask((obj) => world.unspawnObject(obj))).setCancellable(false));
    }
    private chooseExitTile(tile: any, world: World): any {
        const mapSize = world.map.tiles.getMapSize();
        const targetPoint = world.generateRandom() > 0.5
            ? new Vector2(Math.floor(mapSize.width / 2), 0)
            : new Vector2(0, Math.floor(mapSize.height / 2));
        const startPoint = new Vector2(tile.rx, tile.ry);
        const path = bresenham(startPoint.x, startPoint.y, targetPoint.x, targetPoint.y)
            .map(point => world.map.tiles.getByMapCoords(point.x, point.y))
            .filter(isNotNullOrUndefined);
        if (!path.length) {
            throw new Error('No valid exit tile found');
        }
        return path[path.length - 1];
    }
}
