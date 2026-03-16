import { AiDifficulty } from '../gameopts/GameOpts';
import { Bot } from './Bot';
import { DummyBot } from './DummyBot';
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
        if (player.aiDifficulty === AiDifficulty.Easy) {
            return new DummyBot(player.name, player.country.name);
        }
        throw new Error(`Unsupported AI difficulty "${player.aiDifficulty}"`);
    }
}
