import { Rules } from './rules/Rules';
import { Art } from './art/Art';
import { IniFile } from '../data/IniFile';
import { Country } from './Country';
import { ObjectFactory } from './gameobject/ObjectFactory';
import { World } from './World';
import { GameMap } from './GameMap';
import { GameOpts } from './gameopts/GameOpts';
import { OBS_COUNTRY_ID, RANDOM_COUNTRY_ID, RANDOM_COLOR_ID, RANDOM_START_POS } from './gameopts/constants';
import { isNotNullOrUndefined } from '../util/typeGuard';
import { Alliances } from './Alliances';
import { PlayerList } from './PlayerList';
import { UnitSelection } from './gameobject/selection/UnitSelection';
import { BoxedVar } from '../util/BoxedVar';
import { PlayerFactory } from './player/PlayerFactory';
import { PowerTrait } from './trait/PowerTrait';
import { SellTrait } from './trait/SellTrait';
import { RadarTrait } from './trait/RadarTrait';
import { ProductionTrait } from './trait/ProductionTrait';
import { MapShroudTrait } from './trait/MapShroudTrait';
import { Game } from './Game';
import { MapRadiationTrait } from './trait/MapRadiationTrait';
import { ActionFactory } from './action/ActionFactory';
import { ActionFactoryReg } from './action/ActionFactoryReg';
import { SuperWeaponsTrait } from './trait/SuperWeaponsTrait';
import { SharedDetectDisguiseTrait } from './trait/SharedDetectDisguiseTrait';
import { SharedDetectCloakTrait } from './trait/SharedDetectCloakTrait';
import { CrateGeneratorTrait } from './trait/CrateGeneratorTrait';
import { StalemateDetectTrait } from './trait/StalemateDetectTrait';
import { GameOptSanitizer } from './gameopts/GameOptSanitizer';
import { GameOptRandomGen } from './gameopts/GameOptRandomGen';
import { MapLightingTrait } from './trait/MapLightingTrait';
import { Prng } from './Prng';
import { Ai } from './ai/Ai';
import { BotFactory } from './bot/BotFactory';
import { BotManager } from './BotManager';
import { isHumanPlayerInfo } from './gameopts/GameOpts';
interface GameMode {
    type: string;
}
interface GameModeRegistry {
    getById(modeId: string): GameMode;
}
interface PlayerInfo {
    countryId: string;
    colorId: string;
    startPos: number;
    name?: string;
}
interface HumanPlayerInfo extends PlayerInfo {
    name: string;
}
interface AiPlayerInfo extends PlayerInfo {
    difficulty: string;
}
interface GameCreationOptions {
    artOverrides?: IniFile;
    specialFlags: string[];
}
interface StartingLocations {
    [key: number]: any;
}
interface MultiplayerCountry {
    name: string;
}
export class GameFactory {
    static create(gameOptions: GameCreationOptions, mapData: any, baseRules: IniFile, baseArt: IniFile, aiConfig: any, modRules: IniFile, additionalRules: IniFile[], randomSeed1: number | string, randomSeed2: number, gameOpts: GameOpts, gameModeRegistry: GameModeRegistry, skipStalemate: boolean, botConfig: any, debugFlags: any, speedCheat: any, debugBotIndex?: any, actionLogger?: any): Game {
        const mergedRules: IniFile = baseRules.clone().mergeWith(modRules);
        for (const additionalRule of additionalRules) {
            mergedRules.mergeWith(additionalRule);
        }
        mergedRules.mergeWith(gameOptions as any);
        const mergedArt: IniFile = baseArt.clone().mergeWith(gameOptions.artOverrides ?? new IniFile());
        const rules: Rules = new Rules(mergedRules, debugFlags);
        const art: Art = new Art(rules, mergedArt, gameOptions, debugFlags);
        const ai: Ai = new Ai(aiConfig);
        rules.applySpecialFlags(gameOptions.specialFlags as any);
        GameOptSanitizer.sanitize(gameOpts, rules);
        const baseMultiplayerRules: Rules = new Rules(baseRules);
        const multiplayerCountries: MultiplayerCountry[] = baseMultiplayerRules.getMultiplayerCountries();
        const multiplayerColors: string[] = [...baseMultiplayerRules.getMultiplayerColors().values()] as any;
        const prng: Prng = Prng.factory(randomSeed1, randomSeed2);
        const gameMap: GameMap = new GameMap(gameOptions as any, mapData, rules, prng.generateRandomInt.bind(prng));
        const world: World = new World();
        const gameMode: GameMode = gameModeRegistry.getById(gameOpts.gameMode as any);
        const playerList: PlayerList = new PlayerList();
        const alliances: Alliances = new Alliances(playerList);
        const unitSelection: UnitSelection = new UnitSelection();
        const tickCounter: BoxedVar<number> = new BoxedVar<number>(1);
        const objectFactory: ObjectFactory = new ObjectFactory(gameMap.tiles, gameMap.tileOccupation, gameMap.bridges, tickCounter);
        const actionFactory: ActionFactory = new ActionFactory();
        const botFactory: BotFactory = new BotFactory(botConfig);
        const botManager: BotManager = BotManager.factory(actionFactory, botFactory, debugBotIndex, actionLogger);
        const game: Game = new Game(world, gameMap, rules, art, ai, randomSeed1, randomSeed2, gameOpts, gameMode.type, playerList, unitSelection, alliances, tickCounter, objectFactory, botManager);
        new ActionFactoryReg().register(actionFactory, game, undefined);
        this.setupGameTraits(game, rules, gameMap, alliances, gameOpts, skipStalemate, speedCheat);
        const productionTrait: ProductionTrait = game.traits.get(ProductionTrait) as ProductionTrait;
        const playerFactory: PlayerFactory = new PlayerFactory(rules, gameOpts, productionTrait.getAvailableObjects());
        const randomGen: GameOptRandomGen = GameOptRandomGen.factory(randomSeed1, randomSeed2);
        const generatedColors: Map<PlayerInfo, string> = randomGen.generateColors(gameOpts) as any;
        const generatedCountries: Map<PlayerInfo, string> = randomGen.generateCountries(gameOpts, baseMultiplayerRules) as any;
        const generatedStartLocations: Map<PlayerInfo, number> = randomGen.generateStartLocations(gameOpts, gameMap.startingLocations as any);
        const allPlayers: (HumanPlayerInfo | AiPlayerInfo)[] = [
            ...gameOpts.humanPlayers,
            ...gameOpts.aiPlayers
        ].filter(isNotNullOrUndefined) as any;
        this.createPlayers(game, allPlayers, playerFactory, multiplayerCountries, multiplayerColors, rules, generatedCountries, generatedColors, generatedStartLocations);
        game.addPlayer(playerFactory.createNeutral(rules, "@@NEUTRAL@@"));
        return game;
    }
    private static setupGameTraits(game: Game, rules: Rules, gameMap: GameMap, alliances: Alliances, gameOpts: GameOpts, skipStalemate: boolean, speedCheat: any): void {
        game.traits.add(new PowerTrait());
        const sellTrait: SellTrait = new SellTrait(game, rules.general);
        game.sellTrait = sellTrait;
        game.traits.add(sellTrait);
        game.traits.add(new RadarTrait());
        const productionTrait: ProductionTrait = new ProductionTrait(rules, speedCheat);
        game.traits.add(productionTrait);
        const mapShroudTrait: MapShroudTrait = new MapShroudTrait(gameMap, alliances);
        game.mapShroudTrait = mapShroudTrait;
        game.traits.add(mapShroudTrait);
        const mapRadiationTrait: MapRadiationTrait = new MapRadiationTrait(gameMap);
        (game as any).mapRadiationTrait = mapRadiationTrait;
        game.traits.add(mapRadiationTrait);
        const mapLightingTrait: MapLightingTrait = new MapLightingTrait(rules.audioVisual as any, gameMap.getLighting());
        (game as any).mapLightingTrait = mapLightingTrait;
        game.traits.add(mapLightingTrait);
        game.traits.add(new SuperWeaponsTrait());
        game.traits.add(new SharedDetectDisguiseTrait());
        game.traits.add(new SharedDetectCloakTrait());
        const crateGeneratorTrait: CrateGeneratorTrait = new CrateGeneratorTrait(gameOpts.cratesAppear);
        game.crateGeneratorTrait = crateGeneratorTrait;
        game.traits.add(crateGeneratorTrait);
        if (!skipStalemate) {
            const stalemateDetectTrait: StalemateDetectTrait = new StalemateDetectTrait();
            game.stalemateDetectTrait = stalemateDetectTrait;
            game.traits.add(stalemateDetectTrait);
        }
    }
    private static createPlayers(game: Game, allPlayers: (HumanPlayerInfo | AiPlayerInfo)[], playerFactory: PlayerFactory, multiplayerCountries: MultiplayerCountry[], multiplayerColors: string[], rules: Rules, generatedCountries: Map<PlayerInfo, string>, generatedColors: Map<PlayerInfo, string>, generatedStartLocations: Map<PlayerInfo, number>): void {
        allPlayers.forEach((playerInfo: HumanPlayerInfo | AiPlayerInfo) => {
            let playerName: string;
            let isAi: boolean;
            let aiDifficulty: string | undefined;
            let customBotId: string | undefined;
            if (isHumanPlayerInfo(playerInfo)) {
                playerName = playerInfo.name;
                isAi = false;
            }
            else {
                playerName = game.getAiPlayerName(playerInfo);
                isAi = true;
                aiDifficulty = (playerInfo as any).difficulty;
                customBotId = (playerInfo as any).customBotId;
            }
            if (playerInfo.countryId === (OBS_COUNTRY_ID as any)) {
                game.addPlayer(playerFactory.createObserver(playerName, rules));
                return;
            }
            const resolvedCountryId: string = generatedCountries.get(playerInfo) ?? playerInfo.countryId;
            const resolvedColorId: string = generatedColors.get(playerInfo) ?? playerInfo.colorId;
            const resolvedStartPos: number = generatedStartLocations.get(playerInfo) ?? playerInfo.startPos;
            this.validateResolvedValues(resolvedCountryId, resolvedColorId, resolvedStartPos);
            const countryName: string = multiplayerCountries[parseInt(resolvedCountryId)].name;
            const country: Country = Country.factory(countryName, rules as any);
            const color: string = multiplayerColors[parseInt(resolvedColorId)];
            const player = playerFactory.createCombatant(playerName, country, resolvedStartPos, color, isAi, aiDifficulty, customBotId);
            game.addPlayer(player);
        });
    }
    private static validateResolvedValues(countryId: string, colorId: string, startPos: number): void {
        if (countryId === (RANDOM_COUNTRY_ID as any)) {
            throw new Error("Random country should have been resolved by now");
        }
        if (colorId === (RANDOM_COLOR_ID as any)) {
            throw new Error("Random color should have been resolved by now");
        }
        if (startPos === (RANDOM_START_POS as any)) {
            throw new Error("Random start location should have been resolved by now");
        }
    }
}
