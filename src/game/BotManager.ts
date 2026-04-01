import { CompositeDisposable } from '../util/disposable/CompositeDisposable';
import { AppLogger } from '@/util/logger';
import { ActionQueue } from './action/ActionQueue';
import { ActionsApi } from './api/ActionsApi';
import { EventsApi } from './api/EventsApi';
import { GameApi } from './api/GameApi';
import { LoggerApi } from './api/LoggerApi';
import { ProductionApi } from './api/ProductionApi';

const logger = AppLogger.get('BotManager');

export class BotManager {
    private actionFactory: any;
    private actionQueue: ActionQueue;
    private botFactory: any;
    private botDebugIndex: any;
    private actionLogger: any;
    private bots: Map<any, any>;
    private disposables: CompositeDisposable;
    private gameApi?: GameApi;
    static factory(actionFactory: any, botFactory: any, botDebugIndex: any, actionLogger: any): BotManager {
        return new this(actionFactory, new ActionQueue(), botFactory, botDebugIndex, actionLogger);
    }
    constructor(actionFactory: any, actionQueue: ActionQueue, botFactory: any, botDebugIndex: any, actionLogger: any) {
        this.actionFactory = actionFactory;
        this.actionQueue = actionQueue;
        this.botFactory = botFactory;
        this.botDebugIndex = botDebugIndex;
        this.actionLogger = actionLogger;
        this.bots = new Map();
        this.disposables = new CompositeDisposable();
    }
    init(game: any): void {
        this.gameApi = new GameApi(game, true);
        const eventsApi = new EventsApi(game.events);
        const aiCombatants = game.getCombatants().filter((c: any) => c.isAi);
        logger.info(`[BotManager] Initializing ${aiCombatants.length} AI player(s)`);
        for (const combatant of aiCombatants) {
            try {
                const bot = this.botFactory.create(combatant);
                this.bots.set(combatant, bot);
                logger.info(`[BotManager] Created bot "${bot.name}" (${bot.constructor.name}) for country "${combatant.country?.name ?? '?'}"`);
            } catch (e) {
                logger.error(`[BotManager] Failed to create bot for "${combatant.name}":`, e);
            }
        }
        this.updateDebugBotIndex(this.botDebugIndex.value, game);
        const debugIndexHandler = (index: number) => this.updateDebugBotIndex(index, game);
        this.botDebugIndex.onChange.subscribe(debugIndexHandler);
        this.disposables.add(() => this.botDebugIndex.onChange.unsubscribe(debugIndexHandler));
        eventsApi.subscribe((event: any) => {
            this.bots.forEach(bot => {
                try {
                    bot.onGameEvent(event, this.gameApi);
                } catch (e) {
                    logger.error(`[BotManager] Bot "${bot.name}" onGameEvent error:`, e);
                }
            });
        });
        this.disposables.add(eventsApi);
        for (const bot of this.bots.values()) {
            try {
                const player = game.getPlayerByName(bot.name);
                if (!player) {
                    logger.error(`[BotManager] Player "${bot.name}" not found in game`);
                    continue;
                }
                if (!player.production) {
                    logger.error(`[BotManager] Player "${bot.name}" has no production system`);
                    continue;
                }
                bot.setGameApi(this.gameApi);
                bot.setActionsApi(new ActionsApi(game, this.actionFactory, this.actionQueue, bot));
                bot.setProductionApi(new ProductionApi(player.production));
                bot.setLogger(new LoggerApi(AppLogger.get(bot.name) as any, this.gameApi));
                logger.info(`[BotManager] APIs set for bot "${bot.name}", calling onGameStart...`);
                bot.onGameStart(this.gameApi);
                logger.info(`[BotManager] Bot "${bot.name}" onGameStart completed successfully`);
            } catch (e) {
                logger.error(`[BotManager] Bot "${bot.name}" initialization failed:`, e);
            }
        }
        logger.info(`[BotManager] Initialization complete. ${this.bots.size} bot(s) active.`);
    }
    update(gameState: any): void {
        for (const action of this.actionQueue.dequeueAll()) {
            try {
                (action as any).process();
                const actionLog = (action as any).print();
                if (actionLog) {
                    this.actionLogger?.debug?.(`(${action.player.name})@${gameState.currentTick}: ${actionLog}`);
                }
            } catch (e) {
                logger.error(`[BotManager] Action process error @tick ${gameState.currentTick}:`, e);
            }
        }
        for (const combatant of gameState.getCombatants().filter((c: any) => c.isAi)) {
            const bot = this.bots.get(combatant);
            if (!bot) {
                continue;
            }
            try {
                bot.onGameTick(this.gameApi);
            } catch (e) {
                if (gameState.currentTick % 150 === 0) {
                    logger.error(`[BotManager] Bot "${bot.name}" onGameTick error @tick ${gameState.currentTick}:`, e);
                }
            }
        }
    }
    private updateDebugBotIndex(index: number, game: any): void {
        const debugBotName = index > 0 ? game.getAiPlayerName(index) : undefined;
        for (const bot of this.bots.values()) {
            bot.setDebugMode(bot.name === debugBotName);
        }
    }
    dispose(): void {
        this.gameApi = undefined;
        this.bots.clear();
        this.disposables.dispose();
    }
}
