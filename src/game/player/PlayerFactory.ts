import { Player } from '@/game/Player';
import { Country } from '@/game/Country';
import { PowerTrait } from './trait/PowerTrait';
import { RadarTrait } from './trait/RadarTrait';
import { Production } from './production/Production';
import { SideType } from '../SideType';
import { SuperWeaponsTrait } from './trait/SuperWeaponsTrait';
import { SharedDetectDisguiseTrait } from './trait/SharedDetectDisguiseTrait';
export class PlayerFactory {
    private rules: any;
    private gameOpts: any;
    private allAvailableObjects: any;
    constructor(rules: any, gameOpts: any, allAvailableObjects: any) {
        this.rules = rules;
        this.gameOpts = gameOpts;
        this.allAvailableObjects = allAvailableObjects;
    }
    createCombatant(id: any, country: any, team: any, color: any, isAi: boolean, aiDifficulty: any): Player {
        let player = new Player(id, country, team, color);
        player.isAi = isAi;
        player.aiDifficulty = aiDifficulty;
        player.powerTrait = new PowerTrait(player);
        player.traits.add(player.powerTrait);
        player.radarTrait = new RadarTrait();
        player.traits.add(player.radarTrait);
        player.superWeaponsTrait = new SuperWeaponsTrait();
        player.traits.add(player.superWeaponsTrait);
        player.production = Production.factory(player, this.rules, this.gameOpts, this.allAvailableObjects);
        player.sharedDetectDisguiseTrait = new SharedDetectDisguiseTrait();
        return player;
    }
    createObserver(id: any, rules: any): Player {
        let player = new Player(id, undefined, undefined, rules.colors.get("LightGrey"));
        player.radarTrait = new RadarTrait();
        player.traits.add(player.radarTrait);
        player.radarTrait.setDisabled(false);
        return player;
    }
    createNeutral(rules: any, id: any): Player {
        let neutralCountryRule = [...rules.countryRules.values()].find((country) => country.side === SideType.Civilian);
        if (!neutralCountryRule) {
            throw new Error("Missing neutral country. No country found in rules with Civilian side");
        }
        let country = new Country(neutralCountryRule);
        let player = new Player(id, country, undefined, rules.colors.get("LightGrey"));
        player.powerTrait = new PowerTrait(player);
        player.traits.add(player.powerTrait);
        return player;
    }
}
