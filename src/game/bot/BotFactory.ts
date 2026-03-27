import { AiDifficulty } from '../gameopts/GameOpts';
import { Bot } from './Bot';
import { DummyBot } from './DummyBot';
import { BuiltInBotAdapter } from '../ai/thirdpartbot/builtIn/BuiltInBotAdapter';
import { BotRegistry } from '../ai/thirdpartbot/BotRegistry';
import { ThirdPartyBotAdapter } from '../ai/thirdpartbot/ThirdPartyBotAdapter';
export class BotFactory {
    private botsLib: any;
    constructor(botsLib: any) {
        this.botsLib = botsLib;
    }
    create(player: {
        isAi: boolean;
        name: string;
        aiDifficulty: AiDifficulty;
        country: {
            name: string;
        };
    }): Bot {
        if (!player.isAi) {
            throw new Error(`Player "${player.name}" is not an AI`);
        }

        if (player.aiDifficulty === AiDifficulty.Custom) {
            const registry = BotRegistry.getInstance();
            const uploadedBots = registry.getUploadedBots();
            if (uploadedBots.length > 0) {
                const meta = uploadedBots[0];
                console.info(`[BotFactory] Using uploaded bot "${meta.displayName}" for "${player.name}"`);
                return new ThirdPartyBotAdapter(player.name, player.country.name, meta);
            }
            console.warn(`[BotFactory] Custom AI selected but no uploaded bot found, falling back to BuiltInBotAdapter`);
            return new BuiltInBotAdapter(player.name, player.country.name);
        }
        if (player.aiDifficulty === AiDifficulty.Normal) {
            return new BuiltInBotAdapter(player.name, player.country.name);
        }
        if (player.aiDifficulty === AiDifficulty.Easy ||
            player.aiDifficulty === AiDifficulty.Medium ||
            player.aiDifficulty === AiDifficulty.MediumSea ||
            player.aiDifficulty === AiDifficulty.Brutal) {
            return new DummyBot(player.name, player.country.name);
        }
        throw new Error(`Unsupported AI difficulty "${player.aiDifficulty}"`);
    }
}
