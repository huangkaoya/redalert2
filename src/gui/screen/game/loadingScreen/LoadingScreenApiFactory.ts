import { LoadInfoParser } from '@/network/gameopt/LoadInfoParser';
import { LanMatchSession } from '@/network/lan/LanMatchSession';
import { LanLoadingScreenApi } from './LanLoadingScreenApi';
import { MpLoadingScreenApi } from './MpLoadingScreenApi';
import { ReplayLoadingScreenApi } from './ReplayLoadingScreenApi';
import { SpLoadingScreenApi } from './SpLoadingScreenApi';
import { LoadingScreenApi } from './LoadingScreenApi';
export enum LoadingScreenType {
    SinglePlayer = 0,
    MultiPlayer = 1,
    Replay = 2,
    Lan = 3
}
interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<any, any>;
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
export class LoadingScreenApiFactory {
    constructor(private rules: Rules, private strings: Strings, private uiScene: UiScene, private jsxRenderer: JsxRenderer, private gameResConfig: GameResConfig, private gservCon: GservCon) { }
    create(type: LoadingScreenType, lanMatchSession?: LanMatchSession): LoadingScreenApi {
        const { rules, strings, uiScene, jsxRenderer, gameResConfig, gservCon, } = this;
        switch (type) {
            case LoadingScreenType.SinglePlayer:
                return new SpLoadingScreenApi(rules, strings, uiScene, jsxRenderer, gameResConfig);
            case LoadingScreenType.MultiPlayer:
                const loadInfoParser = new LoadInfoParser();
                return new MpLoadingScreenApi(gservCon, loadInfoParser, rules, strings, uiScene, jsxRenderer, gameResConfig);
            case LoadingScreenType.Replay:
                return new ReplayLoadingScreenApi(rules, strings, uiScene, jsxRenderer, gameResConfig);
            case LoadingScreenType.Lan:
                if (!lanMatchSession) {
                    throw new Error('Missing LAN match session for LAN loading screen.');
                }
                return new LanLoadingScreenApi(lanMatchSession, rules, strings, uiScene, jsxRenderer, gameResConfig);
            default:
                throw new Error(`Unsupported loading screen type "${type}"`);
        }
    }
}
