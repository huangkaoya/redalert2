import { ThirdPartyBotMeta } from './ThirdPartyBotInterface';

/**
 * Registry for third-party bots.
 * Manages registration, listing, and instantiation of third-party bots.
 */
export class BotRegistry {
    private static instance: BotRegistry;
    private bots: Map<string, ThirdPartyBotMeta> = new Map();

    private constructor() {}

    static getInstance(): BotRegistry {
        if (!BotRegistry.instance) {
            BotRegistry.instance = new BotRegistry();
        }
        return BotRegistry.instance;
    }

    /**
     * Register a third-party bot.
     */
    register(meta: ThirdPartyBotMeta): void {
        if (this.bots.has(meta.id)) {
            console.warn(`[BotRegistry] Bot "${meta.id}" is already registered, overwriting.`);
        }
        this.bots.set(meta.id, meta);
        console.info(`[BotRegistry] Registered bot: ${meta.displayName} v${meta.version} by ${meta.author}`);
    }

    /**
     * Unregister a third-party bot by ID.
     */
    unregister(botId: string): boolean {
        const meta = this.bots.get(botId);
        if (meta?.builtIn) {
            console.warn(`[BotRegistry] Cannot unregister built-in bot "${botId}".`);
            return false;
        }
        return this.bots.delete(botId);
    }

    /**
     * Get a registered bot by ID.
     */
    get(botId: string): ThirdPartyBotMeta | undefined {
        return this.bots.get(botId);
    }

    /**
     * Get all registered bots.
     */
    getAll(): ThirdPartyBotMeta[] {
        return [...this.bots.values()];
    }

    /**
     * Get all user-uploaded (non-built-in) bots.
     */
    getUploadedBots(): ThirdPartyBotMeta[] {
        return [...this.bots.values()].filter(b => !b.builtIn);
    }

    /**
     * Check if a bot with the given ID is registered.
     */
    has(botId: string): boolean {
        return this.bots.has(botId);
    }

    /**
     * Get the count of registered bots.
     */
    get size(): number {
        return this.bots.size;
    }
}
