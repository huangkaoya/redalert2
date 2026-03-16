import { GameSpeed } from '@/game/GameSpeed';
import { MapShroud, ShroudFlag } from '@/game/map/MapShroud';
import { Box2 } from '@/game/math/Box2';
import { Vector2 } from '@/game/math/Vector2';
import { TechnoRules } from '@/game/rules/TechnoRules';
import { RangeHelper } from '@/game/gameobject/unit/RangeHelper';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { NotifySpawn } from './interface/NotifySpawn';
import { NotifyTick } from './interface/NotifyTick';
import { NotifyUnspawn } from './interface/NotifyUnspawn';
import { NotifyWarpChange } from './interface/NotifyWarpChange';
export class GapGeneratorTrait {
    private radiusTiles: number;
    private refreshTicks: number;
    constructor(radiusTiles: number) {
        this.radiusTiles = radiusTiles;
        this.refreshTicks = 0;
    }
    [NotifyTick.onTick](building: Building, context: GameContext): void {
        if (this.refreshTicks > 0) {
            this.refreshTicks--;
        }
        if (this.refreshTicks <= 0) {
            this.update(building, context);
        }
    }
    [NotifySpawn.onSpawn](building: Building, context: GameContext): void {
        this.markGapTilesForFriendlies(building, building.owner, context, true);
    }
    [NotifyUnspawn.onUnspawn](building: Building, context: GameContext): void {
        this.markGapTilesForFriendlies(building, building.owner, context, false);
        this.update(building, context);
    }
    [NotifyOwnerChange.onChange](building: Building, oldOwner: Player, context: GameContext): void {
        this.markGapTilesForFriendlies(building, oldOwner, context, false);
        this.markGapTilesForFriendlies(building, building.owner, context, true);
        this.update(building, context);
    }
    [NotifyWarpChange.onChange](building: Building, context: GameContext, isWarpedIn: boolean): void {
        this.markGapTilesForFriendlies(building, building.owner, context, !isWarpedIn);
        if (isWarpedIn) {
            this.update(building, context);
        }
    }
    private markGapTilesForFriendlies(building: Building, player: Player, context: GameContext, isActive: boolean): void {
        const players = [player, ...context.alliances.getAllies(player)];
        let nearbyGapGenerators: Building[] | undefined;
        for (const player of players) {
            const shroud = context.mapShroudTrait.getPlayerShroud(player);
            if (shroud) {
                shroud.toggleFlagsAround(building.tile, this.radiusTiles, ShroudFlag.Darken, isActive);
                if (!isActive) {
                    if (!nearbyGapGenerators) {
                        const rangeHelper = new RangeHelper(context.map.tileOccupation);
                        nearbyGapGenerators = players
                            .map(p => [...p.buildings])
                            .flat()
                            .filter(b => b.gapGeneratorTrait &&
                            b !== building &&
                            rangeHelper.tileDistance(b, building) <= b.gapGeneratorTrait.radiusTiles + this.radiusTiles);
                    }
                    for (const gapGenerator of nearbyGapGenerators) {
                        shroud.toggleFlagsAround(gapGenerator.tile, gapGenerator.gapGeneratorTrait.radiusTiles, ShroudFlag.Darken, true);
                    }
                }
            }
        }
    }
    private update(building: Building, context: GameContext): void {
        this.refreshTicks = 5 * GameSpeed.BASE_TICKS_PER_SECOND;
        let technosInRange: GameObject[] | undefined;
        const isActive = building.owner.buildings.has(building) && building.poweredTrait?.isPoweredOn();
        for (const combatant of context.getCombatants()) {
            if (combatant !== building.owner && !context.alliances.areAllied(building.owner, combatant)) {
                const shroud = context.mapShroudTrait.getPlayerShroud(combatant);
                if (shroud) {
                    if (isActive) {
                        shroud.unrevealAround(building.tile, this.radiusTiles);
                        if (!technosInRange) {
                            const range = this.radiusTiles + TechnoRules.MAX_SIGHT;
                            const minPos = new Vector2(building.tile.rx, building.tile.ry).addScalar(-range);
                            const maxPos = new Vector2(building.tile.rx, building.tile.ry).addScalar(range);
                            technosInRange = context.map.technosByTile.queryRange(new Box2(minPos, maxPos));
                        }
                        for (const techno of technosInRange) {
                            if (techno.owner === combatant || context.alliances.areAllied(techno.owner, combatant)) {
                                shroud.revealFrom(techno);
                            }
                            else if (techno.rules.revealToAll) {
                                shroud.revealObject(techno);
                            }
                        }
                    }
                    else if ([...combatant.buildings].some(b => b.rules.spySat)) {
                        shroud.revealAround(building.tile, this.radiusTiles);
                    }
                }
            }
        }
    }
}
