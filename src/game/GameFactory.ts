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

// 类型定义
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

/**
 * 游戏工厂类 - 负责创建和初始化完整的游戏实例
 * 严格遵循业务逻辑，确保所有组件正确创建和配置
 */
export class GameFactory {
  /**
   * 创建游戏实例
   * @param gameOptions - 游戏选项配置
   * @param mapData - 地图数据
   * @param baseRules - 基础规则文件
   * @param baseArt - 基础美术资源文件
   * @param aiConfig - AI配置
   * @param modRules - 模组规则文件
   * @param additionalRules - 额外规则文件数组
   * @param randomSeed1 - 随机数种子1
   * @param randomSeed2 - 随机数种子2
   * @param gameOpts - 游戏选项
   * @param gameModeRegistry - 游戏模式注册表
   * @param skipStalemate - 是否跳过僵局检测
   * @param botConfig - 机器人配置
   * @param networkConfig - 网络配置
   * @param debugFlags - 调试标志
   * @param productionDebugger - 生产调试器
   * @param performanceProfiler - 性能分析器
   */
  static create(
    gameOptions: GameCreationOptions,
    mapData: any,
    baseRules: IniFile,
    baseArt: IniFile,
    aiConfig: any,
    modRules: IniFile,
    additionalRules: IniFile[],
    randomSeed1: number,
    randomSeed2: number,
    gameOpts: GameOpts,
    gameModeRegistry: GameModeRegistry,
    skipStalemate: boolean,
    botConfig: any,
    debugFlags: any,
    speedCheat: any,
    debugBotIndex?: any,
    actionLogger?: any
  ): Game {
    // 1. 合并规则文件
    const mergedRules: IniFile = baseRules.clone().mergeWith(modRules);
    
    // 合并所有额外规则
    for (const additionalRule of additionalRules) {
      mergedRules.mergeWith(additionalRule);
    }
    
    // 最后合并游戏选项中的规则
    mergedRules.mergeWith(gameOptions);

    // 2. 处理美术资源
    const mergedArt: IniFile = baseArt.clone().mergeWith(
      gameOptions.artOverrides ?? new IniFile()
    );

    // 3. 创建核心规则和美术系统
    const rules: Rules = new Rules(mergedRules, debugFlags);
    const art: Art = new Art(rules, mergedArt, gameOptions, debugFlags);
    const ai: Ai = new Ai(aiConfig);

    // 4. 应用特殊标志并清理游戏选项
    rules.applySpecialFlags(gameOptions.specialFlags);
    GameOptSanitizer.sanitize(gameOpts, rules);

    // 5. 创建多人游戏相关数据
    const baseMultiplayerRules: Rules = new Rules(baseRules);
    const multiplayerCountries: MultiplayerCountry[] = baseMultiplayerRules.getMultiplayerCountries();
    const multiplayerColors: string[] = [...baseMultiplayerRules.getMultiplayerColors().values()];

    // 6. 初始化随机数生成器
    const prng: Prng = Prng.factory(randomSeed1, randomSeed2);

    // 7. 创建游戏地图
    const gameMap: GameMap = new GameMap(
      gameOptions,
      mapData,
      rules,
      prng.generateRandomInt.bind(prng)
    );

    // 8. 创建核心游戏组件
    const world: World = new World();
    const gameMode: GameMode = gameModeRegistry.getById(gameOpts.gameMode);
    const playerList: PlayerList = new PlayerList();
    const alliances: Alliances = new Alliances(playerList);
    const unitSelection: UnitSelection = new UnitSelection();
    const tickCounter: BoxedVar<number> = new BoxedVar<number>(1);

    // 9. 创建对象工厂
    const objectFactory: ObjectFactory = new ObjectFactory(
      gameMap.tiles,
      gameMap.tileOccupation,
      gameMap.bridges,
      tickCounter
    );

    // 10. 创建动作系统和机器人管理
    const actionFactory: ActionFactory = new ActionFactory();
    const botFactory: BotFactory = new BotFactory(botConfig);
    const botManager: BotManager = BotManager.factory(
      actionFactory,
      botFactory,
      debugBotIndex,
      actionLogger
    );

    // 11. 创建主游戏实例
    const game: Game = new Game(
      world,
      gameMap,
      rules,
      art,
      ai,
      randomSeed1,
      randomSeed2,
      gameOpts,
      gameMode.type,
      playerList,
      unitSelection,
      alliances,
      tickCounter,
      objectFactory,
      botManager
    );

    // 12. 注册动作工厂
    new ActionFactoryReg().register(actionFactory, game, undefined);

    // 13. 添加游戏特性组件
    this.setupGameTraits(game, rules, gameMap, alliances, gameOpts, skipStalemate, speedCheat);

    // 14. 创建玩家工厂和随机生成器
    const productionTrait: ProductionTrait = game.traits.get(ProductionTrait) as ProductionTrait;
    const playerFactory: PlayerFactory = new PlayerFactory(
      rules,
      gameOpts,
      productionTrait.getAvailableObjects()
    );
    
    const randomGen: GameOptRandomGen = GameOptRandomGen.factory(randomSeed1, randomSeed2);

    // 15. 生成随机选项
    const generatedColors: Map<PlayerInfo, string> = randomGen.generateColors(gameOpts);
    const generatedCountries: Map<PlayerInfo, string> = randomGen.generateCountries(gameOpts, baseMultiplayerRules);
    const generatedStartLocations: Map<PlayerInfo, number> = randomGen.generateStartLocations(
      gameOpts,
      gameMap.startingLocations
    );

    // 16. 创建所有玩家
    const allPlayers: (HumanPlayerInfo | AiPlayerInfo)[] = [
      ...gameOpts.humanPlayers,
      ...gameOpts.aiPlayers
    ].filter(isNotNullOrUndefined);

    this.createPlayers(
      game,
      allPlayers,
      playerFactory,
      multiplayerCountries,
      multiplayerColors,
      rules,
      generatedCountries,
      generatedColors,
      generatedStartLocations
    );

    // 17. 添加中立玩家
    game.addPlayer(playerFactory.createNeutral(rules, "@@NEUTRAL@@"));

    return game;
  }

  /**
   * 设置游戏特性组件
   */
  private static setupGameTraits(
    game: Game,
    rules: Rules,
    gameMap: GameMap,
    alliances: Alliances,
    gameOpts: GameOpts,
    skipStalemate: boolean,
    speedCheat: any
  ): void {
    // 电力特性
    game.traits.add(new PowerTrait());

    // 出售特性
    const sellTrait: SellTrait = new SellTrait(game, rules.general);
    game.sellTrait = sellTrait;
    game.traits.add(sellTrait);

    // 雷达特性
    game.traits.add(new RadarTrait());

    // 生产特性
    const productionTrait: ProductionTrait = new ProductionTrait(rules, speedCheat);
    game.traits.add(productionTrait);

    // 地图迷雾特性
    const mapShroudTrait: MapShroudTrait = new MapShroudTrait(gameMap, alliances);
    game.mapShroudTrait = mapShroudTrait;
    game.traits.add(mapShroudTrait);

    // 地图辐射特性
    const mapRadiationTrait: MapRadiationTrait = new MapRadiationTrait(gameMap);
    game.mapRadiationTrait = mapRadiationTrait;
    game.traits.add(mapRadiationTrait);

    // 地图光照特性
    const mapLightingTrait: MapLightingTrait = new MapLightingTrait(
      rules.audioVisual,
      gameMap.getLighting()
    );
    game.mapLightingTrait = mapLightingTrait;
    game.traits.add(mapLightingTrait);

    // 超级武器特性
    game.traits.add(new SuperWeaponsTrait());

    // 共享侦测特性
    game.traits.add(new SharedDetectDisguiseTrait());
    game.traits.add(new SharedDetectCloakTrait());

    // 箱子生成特性
    const crateGeneratorTrait: CrateGeneratorTrait = new CrateGeneratorTrait(gameOpts.cratesAppear);
    game.crateGeneratorTrait = crateGeneratorTrait;
    game.traits.add(crateGeneratorTrait);

    // 僵局检测特性（可选）
    if (!skipStalemate) {
      const stalemateDetectTrait: StalemateDetectTrait = new StalemateDetectTrait();
      game.stalemateDetectTrait = stalemateDetectTrait;
      game.traits.add(stalemateDetectTrait);
    }
  }

  /**
   * 创建所有玩家
   */
  private static createPlayers(
    game: Game,
    allPlayers: (HumanPlayerInfo | AiPlayerInfo)[],
    playerFactory: PlayerFactory,
    multiplayerCountries: MultiplayerCountry[],
    multiplayerColors: string[],
    rules: Rules,
    generatedCountries: Map<PlayerInfo, string>,
    generatedColors: Map<PlayerInfo, string>,
    generatedStartLocations: Map<PlayerInfo, number>
  ): void {
    allPlayers.forEach((playerInfo: HumanPlayerInfo | AiPlayerInfo) => {
      let playerName: string;
      let isAi: boolean;
      let aiDifficulty: string | undefined;

      // 确定玩家类型和名称
      if (isHumanPlayerInfo(playerInfo)) {
        playerName = playerInfo.name;
        isAi = false;
      } else {
        playerName = game.getAiPlayerName(playerInfo);
        isAi = true;
        aiDifficulty = playerInfo.difficulty;
      }

      // 处理观察者
      if (playerInfo.countryId === OBS_COUNTRY_ID) {
        game.addPlayer(playerFactory.createObserver(playerName, rules));
        return;
      }

      // 解析玩家属性
      const resolvedCountryId: string = generatedCountries.get(playerInfo) ?? playerInfo.countryId;
      const resolvedColorId: string = generatedColors.get(playerInfo) ?? playerInfo.colorId;
      const resolvedStartPos: number = generatedStartLocations.get(playerInfo) ?? playerInfo.startPos;

      // 验证随机值已被解析
      this.validateResolvedValues(resolvedCountryId, resolvedColorId, resolvedStartPos);

      // 创建国家和颜色对象
      const countryName: string = multiplayerCountries[parseInt(resolvedCountryId)].name;
      const country: Country = Country.factory(countryName, rules);
      const color: string = multiplayerColors[parseInt(resolvedColorId)];

      // 创建并添加战斗玩家
      const player = playerFactory.createCombatant(
        playerName,
        country,
        resolvedStartPos,
        color,
        isAi,
        aiDifficulty
      );
      
      game.addPlayer(player);
    });
  }

  /**
   * 验证随机值已被正确解析
   */
  private static validateResolvedValues(
    countryId: string,
    colorId: string,
    startPos: number
  ): void {
    if (countryId === RANDOM_COUNTRY_ID) {
      throw new Error("Random country should have been resolved by now");
    }
    
    if (colorId === RANDOM_COLOR_ID) {
      throw new Error("Random color should have been resolved by now");
    }
    
    if (startPos === RANDOM_START_POS) {
      throw new Error("Random start location should have been resolved by now");
    }
  }
}
