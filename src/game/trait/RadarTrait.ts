import { NotifySpawn } from "@/game/trait/interface/NotifySpawn";
import { NotifyUnspawn } from "@/game/trait/interface/NotifyUnspawn";
import { NotifyPower } from "@/game/trait/interface/NotifyPower";
import { PowerTrait, PowerLevel } from "@/game/player/trait/PowerTrait";
import { RadarOnOffEvent } from "@/game/event/RadarOnOffEvent";
import { NotifyOwnerChange } from "@/game/trait/interface/NotifyOwnerChange";
import { RangeHelper } from "@/game/gameobject/unit/RangeHelper";
import { RadarRules, RadarEventType } from "@/game/rules/general/RadarRules";
import { RadarEvent } from "@/game/event/RadarEvent";
import { NotifyAttack } from "@/game/trait/interface/NotifyAttack";
import { NotifyWarpChange } from "@/game/trait/interface/NotifyWarpChange";
import { NotifySuperWeaponActivate } from "@/game/trait/interface/NotifySuperWeaponActivate";
import { SuperWeaponType } from "@/game/type/SuperWeaponType";
import { NotifySuperWeaponDeactivate } from "@/game/trait/interface/NotifySuperWeaponDeactivate";
export class RadarTrait {
    private activeLightningStrikes: Map<any, number>;
    constructor() {
        this.activeLightningStrikes = new Map();
    }
    [NotifySpawn.onSpawn](entity: any, game: any): void {
        if (entity.isBuilding() && entity.rules.radar) {
            this.updateRadarForPlayer(entity.owner, game);
        }
    }
    [NotifyUnspawn.onUnspawn](entity: any, game: any): void {
        if (entity.isBuilding() && entity.rules.radar) {
            this.updateRadarForPlayer(entity.owner, game);
        }
    }
    [NotifyPower.onPowerLow](player: any, game: any): void {
        this.updateRadarForPlayer(player, game);
    }
    [NotifyPower.onPowerRestore](player: any, game: any): void {
        this.updateRadarForPlayer(player, game);
    }
    [NotifyPower.onPowerChange](): void { }
    [NotifyOwnerChange.onChange](entity: any, oldOwner: any, game: any): void {
        if (entity.rules.radar) {
            this.updateRadarForPlayer(oldOwner, game);
            this.updateRadarForPlayer(entity.owner, game);
        }
    }
    [NotifyWarpChange.onChange](entity: any, game: any): void {
        if (entity.rules.radar) {
            this.updateRadarForPlayer(entity.owner, game);
        }
    }
    [NotifySuperWeaponActivate.onActivate](type: SuperWeaponType, player: any, game: any): void {
        if (type === SuperWeaponType.LightningStorm) {
            this.activeLightningStrikes.set(player, (this.activeLightningStrikes.get(player) ?? 0) + 1);
            for (const combatant of game.getCombatants()) {
                if (combatant !== player && !game.alliances.areAllied(combatant, player)) {
                    this.updateRadarForPlayer(combatant, game);
                }
            }
        }
    }
    [NotifySuperWeaponDeactivate.onDeactivate](type: SuperWeaponType, player: any, game: any): void {
        if (type === SuperWeaponType.LightningStorm) {
            const count = (this.activeLightningStrikes.get(player) ?? 0) - 1;
            if (count > 0) {
                this.activeLightningStrikes.set(player, count);
            }
            else {
                this.activeLightningStrikes.delete(player);
            }
            if (count <= 0) {
                for (const combatant of game.getCombatants()) {
                    this.updateRadarForPlayer(combatant, game);
                }
            }
        }
    }
    private updateRadarForPlayer(player: any, game: any): void {
        if (!player.radarTrait)
            return;
        const wasDisabled = player.radarTrait.isDisabled();
        const shouldDisable = ![...player.buildings].find((building: any) => building.rules.radar && !building.warpedOutTrait.isActive()) ||
            player.powerTrait.level === PowerLevel.Low ||
            [...this.activeLightningStrikes.entries()].some(([strikePlayer, count]) => count && strikePlayer !== player && !game.alliances.areAllied(strikePlayer, player));
        player.radarTrait.setDisabled(shouldDisable);
        if (wasDisabled !== shouldDisable) {
            game.events.dispatch(new RadarOnOffEvent(player, !shouldDisable));
        }
    }
    [NotifyAttack.onAttack](attacker: any, target: any, game: any): void {
        if (!attacker.isTechno())
            return;
        if (!attacker.isBuilding() || attacker.rules.canBeOccupied || attacker.rules.needsEngineer) {
            if (attacker.isVehicle() && attacker.harvesterTrait) {
                this.addEventForPlayer(RadarEventType.HarvesterUnderAttack, attacker.owner, attacker.tile, game);
            }
        }
        else {
            this.addEventForPlayer(RadarEventType.BaseUnderAttack, attacker.owner, attacker.tile, game);
        }
    }
    private addEventForPlayer(eventType: RadarEventType, player: any, tile: any, game: any): void {
        const radarTrait = player.radarTrait;
        if (!radarTrait)
            return;
        const radarRules = game.rules.general.radar;
        radarTrait.activeEvents = radarTrait.activeEvents.filter((event: any) => game.currentTick - event.startTick < radarRules.getEventDuration(event.type));
        const rangeHelper = new RangeHelper(game.map.tileOccupation);
        const hasExistingEvent = radarTrait.activeEvents.find((event: any) => event.type === eventType &&
            rangeHelper.isInTileRange(tile, event.tile, 0, radarRules.getEventSuppresionDistance(event.type)));
        if (!hasExistingEvent) {
            radarTrait.activeEvents.push({
                startTick: game.currentTick,
                tile: tile,
                type: eventType
            });
            game.events.dispatch(new RadarEvent(player, eventType, tile));
        }
    }
}
