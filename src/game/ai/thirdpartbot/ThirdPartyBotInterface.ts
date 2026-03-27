/**
 * Third-party bot interface definition.
 * All custom AI bots must implement this interface.
 */
export interface ThirdPartyBotInterface {
    /** Unique identifier for the bot */
    readonly id: string;
    /** Display name of the bot */
    readonly displayName: string;
    /** Bot version */
    readonly version: string;
    /** Bot author */
    readonly author: string;
    /** Bot description */
    readonly description?: string;

    /**
     * Called when the game starts.
     * Use this to initialize bot state, scan enemies, etc.
     */
    onGameStart(gameApi: any): void;

    /**
     * Called each game tick.
     * This is where the main bot logic should go.
     */
    onGameTick(gameApi: any): void;

    /**
     * Called when a game event occurs (unit destroyed, ownership change, etc.)
     */
    onGameEvent(event: any, data: any): void;

    /**
     * Called when the bot is disposed/destroyed.
     * Clean up any resources here.
     */
    dispose?(): void;
}

/**
 * Metadata for a registered third-party bot.
 */
export interface ThirdPartyBotMeta {
    id: string;
    displayName: string;
    version: string;
    author: string;
    description?: string;
    /** The factory function that creates a bot instance */
    factory: (name: string, country: string) => ThirdPartyBotInterface;
    /** Whether this bot is built-in (not uploaded by user) */
    builtIn: boolean;
    /** Source zip file name (for uploaded bots) */
    sourceFile?: string;
}
