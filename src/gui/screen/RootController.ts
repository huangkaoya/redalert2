import { Controller } from './Controller';
import { ScreenType } from './ScreenType';
export class RootController extends Controller {
    private serverRegions?: any;
    constructor(serverRegions?: any) {
        super();
        this.serverRegions = serverRegions;
    }
    async goToScreenBlocking(screenType: ScreenType, params?: any): Promise<void> {
        return super.goToScreenBlocking(screenType, params);
    }
    goToScreen(screenType: ScreenType, params?: any): void {
        return super.goToScreen(screenType, params);
    }
    async pushScreen(screenType: ScreenType, params?: any): Promise<void> {
        return super.pushScreen(screenType, params);
    }
    createGame(gameId: string, timestamp: number, gameServer?: string, playerName?: string, gameOpts?: any, singlePlayer?: boolean, tournament?: boolean, mapTransfer: boolean = false, createPrivateGame: boolean = false, returnTo?: any): void {
        if (!this.serverRegions) {
            throw new Error('Server regions must be loaded first');
        }
        let gservUrl = '';
        if (!singlePlayer) {
            if (!gameServer) {
                throw new Error('Game server must be set for a multiplayer game');
            }
            gservUrl = gameServer;
        }
        this.goToScreen(ScreenType.Game, {
            create: true,
            gameId,
            timestamp,
            playerName,
            gameOpts,
            singlePlayer,
            tournament,
            mapTransfer,
            createPrivateGame,
            gservUrl,
            returnTo,
        });
    }
    joinGame(gameId: string, timestamp: number, gservUrl: string, playerName?: string, tournament?: boolean, mapTransfer: boolean = false, returnTo?: any): void {
        if (!this.serverRegions) {
            throw new Error('Server regions must be loaded first');
        }
        this.goToScreen(ScreenType.Game, {
            create: false,
            gameId,
            timestamp,
            playerName,
            tournament,
            mapTransfer,
            gservUrl,
            returnTo,
        });
    }
    rerenderCurrentScreen(): void {
        const currentScreen = this.getCurrentScreen() as {
            onViewportChange?: () => void;
        } | undefined;
        console.log('[RootController] Rerender current screen requested', {
            hasCurrentScreen: Boolean(currentScreen),
            screenType: this.getCurrentScreenType(),
            hasViewportHandler: Boolean(currentScreen?.onViewportChange),
        });
        currentScreen?.onViewportChange?.();
    }
}
