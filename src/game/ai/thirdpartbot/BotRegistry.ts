import { ThirdPartyBotMeta } from './ThirdPartyBotInterface';
import { BotSandbox } from './BotSandbox';

interface PersistedBot {
    id: string;
    displayName: string;
    version: string;
    author: string;
    description?: string;
    source: string;
    sourceFile: string;
}

/**
 * Registry for third-party bots.
 * Manages registration, listing, and instantiation of third-party bots.
 */
export class BotRegistry {
    private static instance: BotRegistry;
    private bots: Map<string, ThirdPartyBotMeta> = new Map();
    private botSources: Map<string, { source: string; sourceFile: string }> = new Map();

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
     * Register a bot and store its source for persistence.
     */
    registerWithSource(meta: ThirdPartyBotMeta, source: string, sourceFile: string): void {
        this.register(meta);
        this.botSources.set(meta.id, { source, sourceFile });
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
        this.botSources.delete(botId);
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

    /**
     * Serialize uploaded bots for localStorage persistence.
     */
    serializeUploadedBots(): string {
        const bots: PersistedBot[] = [];
        for (const meta of this.getUploadedBots()) {
            const sourceInfo = this.botSources.get(meta.id);
            if (sourceInfo) {
                bots.push({
                    id: meta.id,
                    displayName: meta.displayName,
                    version: meta.version,
                    author: meta.author,
                    description: meta.description,
                    source: sourceInfo.source,
                    sourceFile: sourceInfo.sourceFile,
                });
            }
        }
        return JSON.stringify(bots);
    }

    /**
     * Load persisted bots from serialized data.
     */
    loadPersistedBots(data: string): void {
        try {
            const bots: PersistedBot[] = JSON.parse(data);
            for (const bot of bots) {
                if (this.bots.has(bot.id)) {
                    continue;
                }
                const meta = BotSandbox.loadBotFromSource(bot.source, bot.sourceFile);
                if (meta) {
                    this.botSources.set(meta.id, { source: bot.source, sourceFile: bot.sourceFile });
                }
            }
        } catch (e) {
            console.error('[BotRegistry] Failed to load persisted bots:', e);
        }
    }
}
