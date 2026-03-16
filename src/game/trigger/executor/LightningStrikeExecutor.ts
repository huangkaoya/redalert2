import { SuperWeaponsTrait } from '@/game/trait/SuperWeaponsTrait';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class LightningStrikeExecutor extends TriggerExecutor {
    execute(game: Game): void {
        const waypoint = this.action.params[6];
        const targetTile = game.map.getTileAtWaypoint(waypoint);
        if (!targetTile) {
            console.warn(`No valid location found for waypoint ${waypoint}. ` +
                `Skipping action ${this.getDebugName()}.`);
            return;
        }
        const player = game.getAllPlayers().find((p) => !p.defeated && p.country?.name === this.trigger.houseName);
        if (!player) {
            return;
        }
        const lightningStormRule = [...game.rules.superWeaponRules.values()].find((rule) => rule.type === SuperWeaponType.LightningStorm);
        if (lightningStormRule) {
            game.traits
                .get(SuperWeaponsTrait)
                .activateEffect(lightningStormRule, player, game, targetTile, undefined, true);
        }
    }
}
