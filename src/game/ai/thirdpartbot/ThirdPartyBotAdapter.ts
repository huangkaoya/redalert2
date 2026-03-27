import { Bot } from '../../bot/Bot';
import { ThirdPartyBotInterface, ThirdPartyBotMeta } from './ThirdPartyBotInterface';

/**
 * Adapter that wraps a ThirdPartyBotInterface into the game's Bot class.
 *
 * The inner bot's onGameStart / onGameTick receive a context object:
 *   { gameApi, actionsApi, productionApi, logger, playerName, country }
 */
export class ThirdPartyBotAdapter extends Bot {
    private thirdPartyBot: ThirdPartyBotInterface;

    constructor(name: string, country: string, meta: ThirdPartyBotMeta) {
        super(name, country);
        this.thirdPartyBot = meta.factory(name, country);
    }

    private createContext(gameApi: any) {
        return {
            gameApi,
            actionsApi: this.actionsApi,
            productionApi: this.productionApi,
            logger: this.logger,
            playerName: this.name,
            country: this.country,
        };
    }

    override onGameStart(event: any): void {
        try {
            this.thirdPartyBot.onGameStart(this.createContext(event));
        } catch (e) {
            console.error(`[ThirdPartyBot:${this.thirdPartyBot.id}] Error in onGameStart:`, e);
        }
    }

    override onGameTick(event: any): void {
        try {
            this.thirdPartyBot.onGameTick(this.createContext(event));
        } catch (e) {
            if (event?.getCurrentTick?.() % 150 === 0) {
                console.error(`[ThirdPartyBot:${this.thirdPartyBot.id}] Error in onGameTick:`, e);
            }
        }
    }

    override onGameEvent(event: any, data: any): void {
        try {
            this.thirdPartyBot.onGameEvent(event, data);
        } catch (e) {
            console.error(`[ThirdPartyBot:${this.thirdPartyBot.id}] Error in onGameEvent:`, e);
        }
    }
}
