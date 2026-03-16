import { jsx } from '@/gui/jsx/jsx';
import { OBS_COUNTRY_ID, NO_TEAM_ID } from '@/game/gameopts/constants';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { LoadingScreenWrapper } from './LoadingScreenWrapper';
import { LoadingScreenApi } from './LoadingScreenApi';
interface LoadInfo {
    name: string;
    status: any;
    loadPercent: number;
}
interface LoadInfoParser {
    parse(data: any): LoadInfo[];
}
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
interface GservCon {
    isOpen(): boolean;
    onLoadInfo: {
        subscribe(handler: (info: any) => void): void;
        unsubscribe(handler: (info: any) => void): void;
    };
    requestLoadInfo(): void;
    sendLoadedPercent(percent: number): void;
}
interface ExtendedPlayerInfo {
    name: string;
    status: any;
    loadPercent: number;
    country: Country;
    color: string;
    team: number;
}
export class MpLoadingScreenApi implements LoadingScreenApi {
    private lastLoadPercent = 0;
    private disposables = new CompositeDisposable();
    private players?: Player[];
    private localPlayerName?: string;
    private mapName?: string;
    private loadingScreen?: any;
    private handleLoadInfoUpdate = (loadInfoData: any) => {
        const loadInfos = this.loadInfoParser.parse(loadInfoData);
        if (this.loadingScreen) {
            this.loadingScreen.applyOptions((options: any) => {
                options.playerInfos = this.createExtendedLoadingInfos(loadInfos);
            });
        }
        else {
            this.createLoadingScreen(loadInfos);
        }
    };
    constructor(private gservCon: GservCon, private loadInfoParser: LoadInfoParser, private rules: Rules, private strings: Strings, private uiScene: UiScene, private jsxRenderer: JsxRenderer, private gameResConfig: GameResConfig) { }
    async start(players: Player[], mapName: string, localPlayerName: string): Promise<void> {
        if (this.gservCon.isOpen()) {
            this.players = players;
            this.localPlayerName = localPlayerName;
            this.mapName = mapName;
            this.gservCon.onLoadInfo.subscribe(this.handleLoadInfoUpdate);
            this.disposables.add(() => this.gservCon.onLoadInfo.unsubscribe(this.handleLoadInfoUpdate));
            this.gservCon.requestLoadInfo();
            const intervalId = setInterval(() => {
                if (this.gservCon.isOpen()) {
                    this.gservCon.requestLoadInfo();
                }
                else {
                    this.disposables.dispose();
                }
            }, 10000);
            this.disposables.add(() => clearInterval(intervalId));
        }
    }
    onLoadProgress(percent: number): void {
        const roundedPercent = Math.floor(percent);
        if (roundedPercent > this.lastLoadPercent) {
            this.lastLoadPercent = roundedPercent;
            if (this.gservCon.isOpen()) {
                this.gservCon.sendLoadedPercent(roundedPercent);
            }
        }
    }
    private createExtendedLoadingInfos(loadInfos: LoadInfo[]): ExtendedPlayerInfo[] {
        const colors = [...this.rules.getMultiplayerColors().values()];
        const countries = this.rules.getMultiplayerCountries();
        const hasTeams = this.players?.every(player => player.countryId === OBS_COUNTRY_ID ||
            player.teamId !== NO_TEAM_ID);
        const extendedInfos = loadInfos
            .map(loadInfo => {
            const player = this.players!.find(p => p.name === loadInfo.name)!;
            return {
                name: loadInfo.name,
                status: loadInfo.status,
                loadPercent: loadInfo.loadPercent,
                country: countries[player.countryId],
                color: player.countryId === OBS_COUNTRY_ID
                    ? "#fff"
                    : colors[player.colorId].asHexString(),
                team: player.teamId,
            };
        });
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
    private createLoadingScreen(loadInfos: LoadInfo[]): void {
        const [uiObject] = this.jsxRenderer.render(jsx(LoadingScreenWrapper, {
            ref: (ref: any) => (this.loadingScreen = ref),
            strings: this.strings,
            rules: this.rules,
            viewport: this.uiScene.menuViewport,
            playerName: this.localPlayerName,
            mapName: this.mapName!,
            playerInfos: this.createExtendedLoadingInfos(loadInfos),
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
