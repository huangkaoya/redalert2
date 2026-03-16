import { jsx } from '@/gui/jsx/jsx';
import { OBS_COUNTRY_ID, NO_TEAM_ID } from '@/game/gameopts/constants';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { PlayerConnectionStatus } from '@/network/gamestate/PlayerConnectionStatus';
import { LoadingScreenWrapper } from './LoadingScreenWrapper';
import { LoadingScreenApi } from './LoadingScreenApi';
interface Player {
    name: string;
    countryId: number;
    colorId: number;
    teamId: number;
}
interface Country {
    name: string;
    side: any;
    uiName: string;
}
interface Rules {
    getMultiplayerColors(): Map<number, any>;
    getMultiplayerCountries(): Country[];
    colors: Map<string, any>;
}
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface UiScene {
    menuViewport: any;
    add(object: any): void;
    remove(object: any): void;
}
interface JsxRenderer {
    render(element: any): any[];
}
interface GameResConfig {
    isCdn(): boolean;
    getCdnBaseUrl(): string;
}
interface ExtendedPlayerInfo {
    name: string;
    status: PlayerConnectionStatus;
    loadPercent: number;
    country: Country;
    color: string;
    team: number;
}
export class ReplayLoadingScreenApi implements LoadingScreenApi {
    private lastLoadPercent = 0;
    private disposables = new CompositeDisposable();
    private players?: Player[];
    private mapName?: string;
    private loadingScreen?: any;
    private lastRenderTime?: number;
    private handleLoadInfoUpdate = (loadPercent: number) => {
        if (this.loadingScreen) {
            const now = performance.now();
            if (!this.lastRenderTime || now - this.lastRenderTime > 1000 / 15) {
                this.lastRenderTime = now;
                this.loadingScreen.applyOptions((options: any) => {
                    options.playerInfos = this.createExtendedLoadingInfos(loadPercent);
                });
            }
        }
        else {
            this.createLoadingScreen(loadPercent);
        }
    };
    constructor(private rules: Rules, private strings: Strings, private uiScene: UiScene, private jsxRenderer: JsxRenderer, private gameResConfig: GameResConfig) { }
    async start(players: Player[], mapName: string): Promise<void> {
        this.players = players;
        this.mapName = mapName;
        this.handleLoadInfoUpdate(0);
    }
    onLoadProgress(percent: number): void {
        const roundedPercent = Math.floor(percent);
        if (roundedPercent > this.lastLoadPercent) {
            this.lastLoadPercent = roundedPercent;
            this.handleLoadInfoUpdate(roundedPercent);
        }
    }
    private createExtendedLoadingInfos(loadPercent: number): ExtendedPlayerInfo[] {
        const colors = [...this.rules.getMultiplayerColors().values()];
        const countries = this.rules.getMultiplayerCountries();
        const hasTeams = this.players?.every(player => player.countryId === OBS_COUNTRY_ID ||
            player.teamId !== NO_TEAM_ID);
        const extendedInfos = this.players!
            .filter(player => player.countryId !== OBS_COUNTRY_ID)
            .map(player => ({
            name: player.name,
            status: PlayerConnectionStatus.Connected,
            loadPercent,
            country: countries[player.countryId],
            color: colors[player.colorId].asHexString(),
            team: player.teamId,
        }));
        if (hasTeams) {
            return extendedInfos.sort((a, b) => {
                if (Boolean(a.country) === Boolean(b.country)) {
                    return a.team - b.team;
                }
                return Number(b.country !== undefined) - Number(a.country !== undefined);
            });
        }
        return extendedInfos;
    }
    private createLoadingScreen(loadPercent: number): void {
        const [uiObject] = this.jsxRenderer.render(jsx(LoadingScreenWrapper, {
            ref: (ref: any) => (this.loadingScreen = ref),
            strings: this.strings,
            rules: this.rules,
            viewport: this.uiScene.menuViewport,
            playerName: undefined,
            mapName: this.mapName!,
            playerInfos: this.createExtendedLoadingInfos(loadPercent),
            gameResConfig: this.gameResConfig,
        }));
        this.uiScene.add(uiObject);
        this.disposables.add(uiObject, () => this.uiScene.remove(uiObject), () => (this.loadingScreen = undefined));
    }
    dispose(): void {
        this.disposables.dispose();
    }
    updateViewport(): void {
        this.loadingScreen?.updateViewport(this.uiScene.menuViewport);
    }
}
