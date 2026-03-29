import { jsx } from '@/gui/jsx/jsx';
import { OBS_COUNTRY_ID, NO_TEAM_ID } from '@/game/gameopts/constants';
import { PlayerConnectionStatus } from '@/network/gamestate/PlayerConnectionStatus';
import { LanMatchSession } from '@/network/lan/LanMatchSession';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
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
    status: any;
    loadPercent: number;
    country: Country;
    color: string;
    team: number;
}

export class LanLoadingScreenApi implements LoadingScreenApi {
    private lastLoadPercent = 0;
    private disposables = new CompositeDisposable();
    private players?: Player[];
    private localPlayerName?: string;
    private mapName?: string;
    private loadingScreen?: any;

    private handleLanMatchUpdate = () => {
        if (!this.players || !this.localPlayerName || !this.mapName) {
            return;
        }
        if (this.loadingScreen) {
            this.loadingScreen.applyOptions((options: any) => {
                options.playerInfos = this.createExtendedLoadingInfos();
            });
            return;
        }
        this.createLoadingScreen();
    };

    constructor(
        private readonly lanMatchSession: LanMatchSession,
        private readonly rules: Rules,
        private readonly strings: Strings,
        private readonly uiScene: UiScene,
        private readonly jsxRenderer: JsxRenderer,
        private readonly gameResConfig: GameResConfig
    ) { }

    async start(players: Player[], mapName: string, localPlayerName: string): Promise<void> {
        this.players = players;
        this.localPlayerName = localPlayerName;
        this.mapName = mapName;
        this.lanMatchSession.onSnapshotChange.subscribe(this.handleLanMatchUpdate);
        this.disposables.add(() => this.lanMatchSession.onSnapshotChange.unsubscribe(this.handleLanMatchUpdate));
        this.handleLanMatchUpdate();
    }

    onLoadProgress(percent: number): void {
        const roundedPercent = Math.floor(percent);
        if (roundedPercent <= this.lastLoadPercent) {
            return;
        }
        this.lastLoadPercent = roundedPercent;
        this.lanMatchSession.reportLoadProgress(roundedPercent);
        this.handleLanMatchUpdate();
    }

    private createExtendedLoadingInfos(): ExtendedPlayerInfo[] {
        const colors = [...this.rules.getMultiplayerColors().values()];
        const countries = this.rules.getMultiplayerCountries();
        const lanSnapshot = this.lanMatchSession.getSnapshot();
        const descriptor = this.lanMatchSession.getLaunchDescriptor();
        const assignmentByName = new Map(descriptor.humanAssignments.map((assignment) => [assignment.name, assignment.peerId] as [string, string]));
        const transportByPeerId = new Map(lanSnapshot.transportMembers.map((member) => [member.id, member]));
        const hasTeams = this.players?.every((player) => player.countryId === OBS_COUNTRY_ID || player.teamId !== NO_TEAM_ID);
        const extendedInfos = (this.players ?? []).map((player) => {
            const peerId = assignmentByName.get(player.name);
            const transportMember = peerId ? transportByPeerId.get(peerId) : undefined;
            const status = !transportMember
                ? PlayerConnectionStatus.Disconnected
                : transportMember.isSelf || transportMember.status === 'connected'
                    ? PlayerConnectionStatus.Connected
                    : PlayerConnectionStatus.Lagging;
            return {
                name: player.name,
                status,
                loadPercent: peerId ? lanSnapshot.loadPercentByPeerId[peerId] ?? 0 : 0,
                country: countries[player.countryId],
                color: player.countryId === OBS_COUNTRY_ID
                    ? '#fff'
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

    private createLoadingScreen(): void {
        const [uiObject] = this.jsxRenderer.render(jsx(LoadingScreenWrapper, {
            ref: (ref: any) => (this.loadingScreen = ref),
            strings: this.strings,
            rules: this.rules,
            viewport: this.uiScene.menuViewport,
            playerName: this.localPlayerName,
            mapName: this.mapName!,
            playerInfos: this.createExtendedLoadingInfos(),
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
