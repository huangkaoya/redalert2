import { BoxedVar } from './util/BoxedVar';
import { EventDispatcher } from './util/event';
import { Routing } from './util/Routing';
import { Config } from './Config';
import { IniFile } from './data/IniFile';
import { IniSection } from './data/IniSection';
import SplashScreenComponent from './gui/component/SplashScreen';
import type { ComponentProps } from 'react';
import { CsfFile, CsfLanguage, csfLocaleMap } from './data/CsfFile';
import { Strings } from './data/Strings';
import { VirtualFile } from './data/vfs/VirtualFile';
import { DataStream } from './data/DataStream';
import { version as appVersion } from './version';
import { MixFile } from './data/MixFile';
import { GameRes } from './engine/gameRes/GameRes';
import { GameResConfig } from './engine/gameRes/GameResConfig';
import { GameResSource } from './engine/gameRes/GameResSource';
import { LocalPrefs, StorageKey } from './LocalPrefs';
import type { Viewport } from './gui/Viewport';
import { Gui } from './Gui';
import { BasicErrorBoxApi } from './gui/component/BasicErrorBoxApi';
import { Engine } from './engine/Engine';
import { ImageContext } from './gui/component/ImageContext';
import { ConsoleVars } from './ConsoleVars';
export type SplashScreenUpdateCallback = (props: ComponentProps<typeof SplashScreenComponent> | null) => void;
class MockLocalPrefs extends LocalPrefs {
    constructor(storage: Storage) {
        super(storage);
        console.log('MockLocalPrefs initialized');
    }
}
class MockConsoleVars extends ConsoleVars {
    constructor() {
        super();
        console.log('MockConsoleVars initialized');
    }
}
class MockDevToolsApi {
    static registerCommand(name: string, cmd: Function) { console.log(`MockDevToolsApi: registerCommand ${name}`); }
    static registerVar(name: string, bv: BoxedVar<any>) { console.log(`MockDevToolsApi: registerVar ${name}`); }
    static listCommands(): string[] { return []; }
    static listVars(): string[] { return []; }
}
class MockFullScreen {
    onChange = new EventDispatcher<MockFullScreen, boolean>();
    constructor(doc: Document) { console.log('MockFullScreen initialized'); }
    init() { }
    isFullScreen(): boolean { return false; }
}
const mockSentry = {
    captureException: (e: any) => console.error("Sentry Mock: captureException", e),
    configureScope: (cb: Function) => cb({ setTag: () => { }, setExtra: () => { } }),
};
class ViewportAdapter implements Viewport {
    constructor(private boxedVar: BoxedVar<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>) { }
    get value(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        return this.boxedVar.value;
    }
    getValue(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        return this.boxedVar.value;
    }
    rootElement?: HTMLElement;
}
export class Application {
    private async importOptionalDevModule<T = any>(path: string): Promise<T> {
        const dynamicImport = new Function('modulePath', 'return import(modulePath);') as (modulePath: string) => Promise<T>;
        return dynamicImport(path);
    }
    private formatString(template: string, ...args: any[]): string {
        if (!args || args.length === 0)
            return template;
        let result = template;
        for (let i = 0; i < args.length; i++) {
            const placeholder = new RegExp(`%s|%d`, 'i');
            result = result.replace(placeholder, String(args[i]));
        }
        return result;
    }
    public viewport: BoxedVar<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    private viewportAdapter: ViewportAdapter;
    public config!: Config;
    private strings!: Strings;
    private localPrefs: LocalPrefs;
    private rootEl: HTMLElement | null = null;
    private runtimeVars: MockConsoleVars;
    private fullScreen: MockFullScreen;
    public routing: Routing;
    private sentry: typeof mockSentry | undefined = mockSentry;
    private currentLocale: string = 'en-US';
    private fsAccessLib: any;
    private gameResConfig: GameResConfig | undefined;
    private cdnResourceLoader: any;
    private gpuTier: any;
    private splashScreenUpdateCallback?: SplashScreenUpdateCallback;
    private gui?: Gui;
    constructor(splashScreenUpdateCallback?: SplashScreenUpdateCallback) {
        this.viewport = new BoxedVar({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
        this.viewportAdapter = new ViewportAdapter(this.viewport);
        this.routing = new Routing();
        this.splashScreenUpdateCallback = splashScreenUpdateCallback;
        this.localPrefs = new MockLocalPrefs(localStorage);
        this.runtimeVars = new MockConsoleVars();
        this.fullScreen = new MockFullScreen(document);
        console.log('Application constructor finished.');
    }
    public getVersion(): string {
        return appVersion;
    }
    private async loadConfig(): Promise<void> {
        console.log('[Application] Attempting to load config.ini...');
        try {
            const response = await fetch('/config.ini');
            if (!response.ok) {
                throw new Error(`Failed to fetch config.ini: ${response.status} ${response.statusText}`);
            }
            const iniString = await response.text();
            const iniFileInstance = new IniFile(iniString);
            this.config = new Config();
            this.config.load(iniFileInstance);
            console.log('[Application] config.ini loaded and parsed successfully.');
            console.log('[Application] Config object dump:', this.config);
            console.log('[Application] Verification: Default Locale from config:', this.config.defaultLocale);
            console.log('[Application] Verification: Viewport Width from config:', this.config.viewport.width);
            console.log('[Application] Verification: Dev Mode from config:', this.config.devMode);
            console.log('[Application] Verification: Servers URL from config:', this.config.serversUrl);
        }
        catch (error) {
            console.error('[Application] Failed to parse config:', error);
            console.error('[Application] Config parsing failed. Using minimal defaults.');
            this.config = new Config();
            console.error("Failed to load application configuration (config.ini). Using minimal defaults. Some features may not work.");
        }
    }
    private async loadTranslations(): Promise<void> {
        const currentConfig = this.config;
        if (!currentConfig) {
            console.error("[Application] Config not loaded before loadTranslations. Skipping.");
            this.strings = new Strings();
            this.currentLocale = 'en-US';
            return;
        }
        let csfFileValue = currentConfig.getGeneralData().get('csfFile') || 'ra2/general.csf';
        const csfFileName = Array.isArray(csfFileValue) ? csfFileValue[0] : csfFileValue;
        console.log(`[Application] Attempting to load CSF file: ${csfFileName}`);
        try {
            const csfResponse = await fetch(`/${csfFileName}`);
            if (!csfResponse.ok) {
                throw new Error(`Failed to fetch CSF file ${csfFileName}: ${csfResponse.status} ${csfResponse.statusText}`);
            }
            const arrayBuffer = await csfResponse.arrayBuffer();
            const dataStream = new DataStream(arrayBuffer, 0, DataStream.LITTLE_ENDIAN);
            dataStream.dynamicSize = false;
            const virtualFile = new VirtualFile(dataStream, csfFileName);
            const csfFileInstance = new CsfFile(virtualFile);
            this.strings = new Strings(csfFileInstance);
            this.currentLocale = csfFileInstance.getIsoLocale() || currentConfig.defaultLocale;
            console.log(`[Application] CSF file "${csfFileName}" loaded. Detected/Set Locale: ${this.currentLocale}. Loaded ${Object.keys(this.strings.getKeys()).length} keys from CSF.`);
        }
        catch (error) {
            console.error(`[Application] Failed to load or parse CSF file "${csfFileName}":`, error);
            console.warn('[Application] Falling back to empty Strings object for CSF part.');
            this.strings = new Strings();
            this.currentLocale = currentConfig.defaultLocale;
        }
        const jsonLocaleFile = `res/locale/${this.currentLocale}.json?v=${this.getVersion()}`;
        console.log(`[Application] Attempting to load JSON locale file: ${jsonLocaleFile}`);
        try {
            const jsonResponse = await fetch(`/${jsonLocaleFile}`);
            if (!jsonResponse.ok) {
                throw new Error(`Failed to fetch JSON locale ${jsonLocaleFile}: ${jsonResponse.status} ${jsonResponse.statusText}`);
            }
            const jsonData = await jsonResponse.json();
            if (jsonData) {
                this.strings.fromJson(jsonData);
                console.log(`[Application] JSON locale file "${jsonLocaleFile}" loaded and merged. Total keys now: ${Object.keys(this.strings.getKeys()).length}.`);
            }
            else {
                console.warn(`[Application] JSON locale file "${jsonLocaleFile}" parsed to null or undefined data.`);
            }
        }
        catch (error) {
            console.error(`[Application] Failed to load or parse JSON locale file "${jsonLocaleFile}":`, error);
            console.warn(`[Application] Continuing without strings from ${jsonLocaleFile}.`);
        }
        console.log('[Application] Translations loading finished. Final locale: ', this.currentLocale);
        console.log('[Application] Sample string GUI:OKAY ->', this.strings.get('GUI:OKAY'));
        console.log('[Application] Sample string GUI:Cancel ->', this.strings.get('GUI:Cancel'));
        console.log('[Application] Sample string GUI:LoadingEx ->', this.strings.get('GUI:LoadingEx'));
        console.log('[Application] First 20 keys in Strings:', this.strings.getKeys().slice(0, 20));
    }
    private checkGlobalLibs(): void {
        console.log('[MVP] Skipping Application.checkGlobalLibs().');
    }
    private async initLogging(): Promise<void> {
        console.log('[MVP] Skipping Application.initLogging().');
    }
    private updateViewportSize(isFullScreen: boolean): void {
        let newWidth: number, newHeight: number;
        if (isFullScreen) {
            newWidth = window.screen.width;
            newHeight = window.screen.height;
        }
        else {
            const configWidth = this.config?.viewport?.width ?? Number.POSITIVE_INFINITY;
            const configHeight = this.config?.viewport?.height ?? Number.POSITIVE_INFINITY;
            newWidth = Math.min(window.innerWidth, configWidth);
            newHeight = Math.min(window.innerHeight, configHeight);
        }
        newWidth = Math.max(800, newWidth - (newWidth % 2));
        newHeight = Math.max(600, newHeight - (newHeight % 2));
        this.viewport.value = { ...this.viewport.value, width: newWidth, height: newHeight };
        console.log(`[MVP] updateViewportSize: ${newWidth}x${newHeight}, Fullscreen: ${isFullScreen}`);
    }
    private onFullScreenChange(isFullScreen: boolean): void {
        console.log(`[MVP] onFullScreenChange: ${isFullScreen}`);
    }
    private async loadGpuBenchmarkData(): Promise<any> {
        console.log('[MVP] Skipping Application.loadGpuBenchmarkData()');
        return { tier: 1, type: 'MOCK_GPU' };
    }
    public async main(): Promise<void> {
        console.log('Application.main() called');
        this.rootEl = document.getElementById("ra2web-root");
        if (!this.rootEl) {
            console.error("CRITICAL: Missing root element #ra2web-root in HTML.");
            const errorMsg = "CRITICAL: Missing root element #ra2web-root for the application.";
            if (document.body) {
                document.body.innerHTML = `<h1>Error</h1><p>${errorMsg}</p>`;
            }
            else {
                alert(errorMsg);
            }
            return;
        }
        if (this.splashScreenUpdateCallback) {
            this.splashScreenUpdateCallback({
                width: this.viewport.value.width,
                height: this.viewport.value.height,
                parentElement: this.rootEl,
                loadingText: 'Initializing...'
            });
        }
        try {
            await this.loadConfig();
        }
        catch (e) {
            console.error("CRITICAL: Application.loadConfig() failed. See previous errors.", e);
            if (this.rootEl)
                this.rootEl.innerHTML = "<h1>Error</h1><p>Failed to load critical application configuration. Please check console.</p>";
            return;
        }
        const locale = this.config.defaultLocale;
        if (this.splashScreenUpdateCallback) {
            this.splashScreenUpdateCallback({
                width: this.viewport.value.width,
                height: this.viewport.value.height,
                parentElement: this.rootEl,
                loadingText: 'Loading translations...'
            });
        }
        try {
            await this.loadTranslations();
        }
        catch (e) {
            console.error(`Missing translation ${locale}.`, e);
            return;
        }
        if (this.splashScreenUpdateCallback) {
            this.splashScreenUpdateCallback({
                width: this.viewport.value.width,
                height: this.viewport.value.height,
                parentElement: this.rootEl,
                loadingText: this.strings.get("gui:loadingex"),
                copyrightText: this.strings.get("txt_copyright") + "\n" + this.strings.get("gui:wwbrand"),
                disclaimerText: this.strings.get("ts:disclaimer")
            });
        }
        try {
            this.checkGlobalLibs();
        }
        catch (e: any) {
            console.error("Global library check failed:", e);
            const errorMsg = this.strings.get("TS:DownloadFailed");
            const errorBox = new BasicErrorBoxApi(this.viewport, this.strings, this.rootEl!);
            await errorBox.show(errorMsg, true);
            return;
        }
        this.runtimeVars = new MockConsoleVars();
        MockDevToolsApi.registerVar("freecamera", this.runtimeVars.freeCamera);
        await this.initLogging();
        this.fullScreen = new MockFullScreen(document);
        this.fullScreen.init();
        this.fullScreen.onChange.subscribe((isFS: boolean) => {
            this.onFullScreenChange(isFS);
            this.updateViewportSize(isFS);
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.updateViewportSize(this.fullScreen.isFullScreen()));
            this.updateViewportSize(this.fullScreen.isFullScreen());
        }
        this.loadGpuBenchmarkData()
            .then(gpuData => this.gpuTier = gpuData)
            .catch(e => this.sentry?.captureException(e));
        if (!window.FileSystemAccess) {
            console.error("FileSystemAccess not available. Make sure fsalib.min.js is loaded.");
            await this.handleGameResLoadError(new Error("Failed to load File System Access library"), this.strings, true);
            return;
        }
        this.fsAccessLib = window.FileSystemAccess;
        const urlParams = new URLSearchParams(window.location.search);
        const modName = urlParams.get('mod');
        let gameResConfig = this.loadGameResConfig(this.localPrefs);
        try {
            const gameRes = new GameRes(this.getVersion(), modName || undefined, this.fsAccessLib, this.localPrefs, this.strings, this.rootEl, this.createSplashScreenInterface(), this.viewportAdapter, this.config, "res/", this.sentry);
            const { configToPersist, cdnResLoader } = await gameRes.init(gameResConfig, (error, strings) => this.handleGameResLoadError(error, strings), (error, strings) => this.handleGameResImportError(error, strings));
            try {
                const vfsAny: any = (Engine as any).vfs;
                if (vfsAny?.debugListFileOwners) {
                    vfsAny.debugListFileOwners('rules.ini');
                    vfsAny.debugListFileOwners('art.ini');
                    vfsAny.debugListFileOwners('rulescd.ini');
                    vfsAny.debugListFileOwners('artcd.ini');
                }
                try {
                    const rulesFile = (Engine as any).vfs.openFile('rules.ini');
                    const rulesHead = rulesFile.readAsString().split(/\r?\n/).slice(0, 40);
                    console.log('[Diag] rules.ini head (first 40 lines):', rulesHead);
                }
                catch (e) {
                    console.warn('[Diag] Failed to read rules.ini head:', e);
                }
                try {
                    const rulesCdFile = (Engine as any).vfs.openFile('rulescd.ini');
                    const rulesCdHead = rulesCdFile.readAsString().split(/\r?\n/).slice(0, 40);
                    console.log('[Diag] rulescd.ini head (first 40 lines):', rulesCdHead);
                }
                catch (e) {
                    console.warn('[Diag] Failed to read rulescd.ini head:', e);
                }
            }
            catch (e) {
                console.warn('[Diag] VFS ownership diagnostics failed:', e);
            }
            if (configToPersist) {
                if (configToPersist.isCdn()) {
                    this.localPrefs.removeItem(StorageKey.GameRes);
                }
                else {
                    this.localPrefs.setItem(StorageKey.GameRes, configToPersist.serialize());
                }
                gameResConfig = configToPersist;
            }
            this.gameResConfig = gameResConfig;
            this.cdnResourceLoader = cdnResLoader;
            ImageContext.cdnBaseUrl = this.gameResConfig?.isCdn()
                ? this.gameResConfig.getCdnBaseUrl()
                : undefined;
            ImageContext.vfs = Engine.vfs;
            try {
                console.log("Engine.iniFiles.has('rules.ini'):", Engine.iniFiles.has("rules.ini"));
                console.log("Engine.iniFiles.has('art.ini'):", Engine.iniFiles.has("art.ini"));
                console.log("[Diag] Engine.iniFiles.has('rulescd.ini'):", Engine.iniFiles.has("rulescd.ini"));
                console.log("[Diag] Engine.iniFiles.has('artcd.ini'):", Engine.iniFiles.has("artcd.ini"));
                Engine.loadRules();
                try {
                    const rulesIniUsed = Engine.getFileNameVariant('rules.ini');
                    const artIniUsed = Engine.getFileNameVariant('art.ini');
                    console.log('[Diag] Using base INIs:', { rulesIniUsed, artIniUsed });
                    const hasAPSplashSection = !!Engine.getIni(artIniUsed).getSection('APSplash') || !!Engine.getIni(rulesIniUsed).getSection('APSplash');
                    console.log('[Diag] APSplash section present in INIs:', hasAPSplashSection);
                    try {
                        const orderedSections: any[] = (Engine.getRules() as any).getOrderedSections?.() ?? [];
                        console.log('[Diag] Merged rules - first sections:', orderedSections.slice(0, 120).map(s => s.name));
                    }
                    catch (e) {
                        console.warn('[Diag] Failed to dump ordered sections from merged rules:', e);
                    }
                    try {
                        const mergedRules: any = Engine.getRules();
                        const warheads = mergedRules?.getSection?.('Warheads');
                        const listed: string[] = [];
                        if (warheads?.entries) {
                            warheads.entries.forEach((v: any) => {
                                if (typeof v === 'string')
                                    listed.push(v);
                                else if (Array.isArray(v))
                                    listed.push(...v);
                            });
                        }
                        console.log('[Diag] Warheads listed (sample):', listed.slice(0, 40), 'total=', listed.length);
                    }
                    catch (e) {
                        console.warn('[Diag] Failed to dump Warheads list from merged rules:', e);
                    }
                    try {
                        const mergedRules: any = Engine.getRules();
                        const ObjectType: any = (Engine as any).ObjectType || (window as any).ra2web?.engine?.type?.ObjectType;
                        const hasCdestSection = !!mergedRules.getSection?.('CDEST');
                        console.log('[Diag] CDEST section exists in merged rules:', hasCdestSection);
                        try {
                            const s = mergedRules.getSection?.('CDEST');
                            if (s?.entries) {
                                const keys: string[] = [];
                                s.entries.forEach((_v: any, k: string) => keys.push(k));
                                console.log('[Diag] CDEST merged keys (sample):', keys.slice(0, 30));
                                console.log('[Diag] CDEST Primary/Secondary/ElitePrimary/EliteSecondary:', s.get?.('Primary'), s.get?.('Secondary'), s.get?.('ElitePrimary'), s.get?.('EliteSecondary'));
                            }
                        }
                        catch (e) {
                            console.warn('[Diag] CDEST merged entries dump failed:', e);
                        }
                        const cdest = mergedRules.getObject?.('CDEST', ObjectType?.Vehicle ?? 2);
                        let weaponName: string | undefined = cdest?.primary || cdest?.elitePrimary || cdest?.secondary || cdest?.eliteSecondary;
                        if (weaponName) {
                            const wpn = mergedRules.getWeapon(weaponName);
                            console.log('[Diag] CDEST weapon mapping:', { weapon: wpn.name, warhead: wpn.warhead });
                            const hasWh = !!mergedRules.getSection?.(wpn.warhead);
                            console.log('[Diag] CDEST warhead section exists in merged rules:', hasWh);
                        }
                        else {
                            console.log('[Diag] CDEST weapon mapping: no primary/secondary found');
                        }
                        try {
                            const cdestSection = mergedRules.getSection?.('CDEST');
                            const spawnsName = cdestSection?.get?.('Spawns');
                            console.log('[Diag] CDEST Spawns:', spawnsName);
                            if (spawnsName) {
                                try {
                                    const spawnedRules = mergedRules.getObject?.(spawnsName, ObjectType?.Aircraft ?? 1);
                                    const spawnedPrimary = spawnedRules?.primary || spawnedRules?.elitePrimary || spawnedRules?.secondary || spawnedRules?.eliteSecondary;
                                    if (spawnedPrimary) {
                                        const spawnedWpn = mergedRules.getWeapon(spawnedPrimary);
                                        console.log('[Diag] Spawned unit primary:', { weapon: spawnedWpn.name, warhead: spawnedWpn.warhead });
                                    }
                                    else {
                                        console.log('[Diag] Spawned unit has no primary/secondary');
                                    }
                                }
                                catch (e) {
                                    console.warn('[Diag] Spawned unit probe failed:', e);
                                }
                            }
                        }
                        catch (e) {
                            console.warn('[Diag] CDEST Spawns probe failed:', e);
                        }
                        try {
                            const aswMerged = mergedRules.getSection?.('ASWLauncher');
                            const aswMergedWh = aswMerged?.get?.('Warhead');
                            console.log('[Diag] ASWLauncher in merged rules: warhead=', aswMergedWh);
                        }
                        catch (e) {
                            console.warn('[Diag] ASWLauncher merged probe failed:', e);
                        }
                        try {
                            const baseAsw = Engine.getIni('rules.ini').getSection('ASWLauncher');
                            const baseAswWh = baseAsw?.get?.('Warhead');
                            console.log('[Diag] ASWLauncher in base rules.ini: warhead=', baseAswWh);
                        }
                        catch (e) {
                            console.warn('[Diag] ASWLauncher base probe failed:', e);
                        }
                        try {
                            const apsInRulesCd = !!Engine.getIni('rulescd.ini').getSection('APSplash');
                            const apsInArtCd = !!Engine.getIni('artcd.ini').getSection('APSplash');
                            console.log('[Diag] APSplash in rulescd.ini:', apsInRulesCd, 'APSplash in artcd.ini:', apsInArtCd);
                        }
                        catch (e) {
                            console.warn('[Diag] APSplash custom INI presence probe failed:', e);
                        }
                        try {
                            const mergedHasAPSplash = !!mergedRules.getSection?.('APSplash');
                            console.log('[Diag] APSplash section exists in merged rules:', mergedHasAPSplash);
                        }
                        catch (e) {
                            console.warn('[Diag] APSplash merged presence check failed:', e);
                        }
                        try {
                            const baseCdest = Engine.getIni('rules.ini').getSection('CDEST');
                            const customCdest = Engine.getIni('rulescd.ini').getSection('CDEST');
                            console.log('[Diag] Base CDEST present:', !!baseCdest, 'Custom CDEST present:', !!customCdest);
                            if (baseCdest) {
                                console.log('[Diag] Base CDEST Primary/Secondary:', baseCdest.get?.('Primary'), baseCdest.get?.('Secondary'));
                            }
                            if (customCdest) {
                                console.log('[Diag] Custom CDEST Primary/Secondary:', customCdest.get?.('Primary'), customCdest.get?.('Secondary'));
                            }
                        }
                        catch (e) {
                            console.warn('[Diag] Base/Custom CDEST probe failed:', e);
                        }
                    }
                    catch (e) {
                        console.warn('[Diag] CDEST mapping diagnostics failed:', e);
                    }
                }
                catch (e) {
                    console.warn('[Diag] INI presence diagnostics failed:', e);
                }
                try {
                    const baseArt = Engine.getIni('art.ini');
                    const customArt = Engine.getIni('artcd.ini');
                    const mergedArt = Engine.getArt();
                    const probe = (name: string) => ({
                        name,
                        base: !!baseArt?.getSection(name),
                        custom: !!customArt?.getSection(name),
                        merged: !!mergedArt?.getSection(name),
                    });
                    console.log('[Diag] Art sections presence:', probe('GI'), probe('CONS'), probe('SEAL'), probe('ENGINEER'), probe('ROCK'));
                }
                catch (e) {
                    console.warn('[Diag] Art presence diagnostics failed:', e);
                }
            }
            catch (err) {
                console.error('[Application] Engine.loadRules() failed:', err);
            }
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'app_init', {
                    res: this.gameResConfig?.source || 'unknown',
                    modName: modName || '<none>'
                });
            }
            this.sentry?.configureScope((scope: any) => {
                scope.setTag('mod', modName || '<none>');
                scope.setExtra('mod', modName || '<none>');
                let modHash: string | number = 'unknown';
                try {
                    modHash = Engine.getModHash();
                }
                catch { }
                scope.setExtra('modHash', modHash);
            });
        }
        catch (e) {
            console.error("Failed to initialize GameRes:", e);
            await this.handleGameResLoadError(e as Error, this.strings, true);
            return;
        }
        this.initRouting();
        if (this.splashScreenUpdateCallback) {
            this.splashScreenUpdateCallback(null);
        }
    }
    private loadGameResConfig(prefs: LocalPrefs): GameResConfig | undefined {
        const serializedConfig = prefs.getItem(StorageKey.GameRes);
        if (serializedConfig) {
            try {
                const config = new GameResConfig(this.config.gameresBaseUrl || "");
                config.unserialize(serializedConfig);
                if (config.isCdn() && !config.getCdnBaseUrl()) {
                    return undefined;
                }
                return config;
            }
            catch (e) {
                console.error("Failed to load GameResConfig from preferences:", e);
            }
        }
        return undefined;
    }
    private initRouting(): void {
        let currentHandler: any = null;
        this.routing.addRoute("*", async () => {
            if (currentHandler && currentHandler.destroy) {
                console.log('[Application] Destroying current handler');
                await currentHandler.destroy();
                currentHandler = null;
            }
        });
        this.routing.addRoute("/", async () => {
            console.log('[Application] Initializing main page');
            this.gui = new Gui(this.getVersion(), this.strings, this.config, this.viewport, this.rootEl!, this.cdnResourceLoader, this.gameResConfig, this.runtimeVars);
            await this.gui.init();
            currentHandler = this;
        });
        this.routing.addRoute("/vxltest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing VxlTester');
            const { VxlTester } = await this.importOptionalDevModule('./tools/VxlTester');
            await VxlTester.main(Engine.vfs, this.runtimeVars);
            currentHandler = VxlTester;
        });
        this.routing.addRoute("/lobbytest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing LobbyFormTester');
            const { LobbyFormTester } = await this.importOptionalDevModule('./tools/LobbyFormTester');
            await LobbyFormTester.main(this.rootEl!, this.strings);
            currentHandler = LobbyFormTester;
        });
        this.routing.addRoute("/soundtest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing SoundTester');
            const { SoundTester } = await this.importOptionalDevModule('./tools/SoundTester');
            await SoundTester.main(Engine.vfs, this.rootEl!);
            currentHandler = SoundTester;
        });
        this.routing.addRoute("/buildtest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing BuildingTester');
            const { BuildingTester } = await this.importOptionalDevModule('./tools/BuildingTester');
            await BuildingTester.main([]);
            currentHandler = BuildingTester;
        });
        this.routing.addRoute("/inftest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing InfantryTester');
            const { InfantryTester } = await this.importOptionalDevModule('./tools/InfantryTester');
            await InfantryTester.main(this.runtimeVars);
            currentHandler = InfantryTester;
        });
        this.routing.addRoute("/airtest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing AircraftTester');
            const { AircraftTester } = await this.importOptionalDevModule('./tools/AircraftTester');
            await AircraftTester.main(this.runtimeVars);
            currentHandler = AircraftTester;
        });
        this.routing.addRoute("/vehicletest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing VehicleTester');
            const { VehicleTester } = await this.importOptionalDevModule('./tools/VehicleTester');
            await VehicleTester.main(this.runtimeVars);
            currentHandler = VehicleTester;
        });
        this.routing.addRoute("/shptest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing ShpTester');
            const { MapFile } = await import('./data/MapFile');
            const gameMap = new MapFile(Engine.vfs.openFile("mp03t4.map"));
            const { ShpTester } = await this.importOptionalDevModule('./tools/ShpTester');
            await ShpTester.main(Engine.vfs, gameMap, this.rootEl!, this.strings);
            currentHandler = ShpTester;
        });
        this.routing.addRoute("/worldscenetest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing WorldSceneTester');
            const { MapFile } = await import('./data/MapFile');
            const gameMap = new MapFile(Engine.vfs.openFile("mp03t4.map"));
            const { WorldSceneTester } = await this.importOptionalDevModule('./tools/WorldSceneTester');
            await WorldSceneTester.main(Engine.vfs, gameMap, this.rootEl!, this.strings);
            currentHandler = WorldSceneTester;
        });
        this.routing.addRoute("/unitmovementtest", async () => {
            if (!Engine.vfs) {
                throw new Error("Original game files must be provided.");
            }
            console.log('[Application] Initializing UnitMovementTester');
            const { MapFile } = await import('./data/MapFile');
            const gameMap = new MapFile(Engine.vfs.openFile("mp03t4.map"));
            const { UnitMovementTester } = await this.importOptionalDevModule('./tools/UnitMovementTester');
            await UnitMovementTester.main(Engine.vfs, gameMap, this.rootEl!, this.strings);
            currentHandler = UnitMovementTester;
        });
        this.routing.init();
    }
    async destroy(): Promise<void> {
        console.log('[Application] Destroying Application');
        if (this.gui) {
            if (this.gui.destroy) {
                await this.gui.destroy();
            }
            this.gui = undefined;
        }
    }
    private createSplashScreenInterface() {
        return {
            setLoadingText: (text: string) => {
                console.log(`[Application] Splash Loading: "${text}"`);
                if (this.splashScreenUpdateCallback) {
                    this.splashScreenUpdateCallback({
                        width: this.viewport.value.width,
                        height: this.viewport.value.height,
                        parentElement: this.rootEl,
                        loadingText: text
                    });
                }
            },
            setBackgroundImage: (url: string) => {
                console.log(`[Application] Splash Background: ${url}`);
                if (this.splashScreenUpdateCallback) {
                    this.splashScreenUpdateCallback({
                        width: this.viewport.value.width,
                        height: this.viewport.value.height,
                        parentElement: this.rootEl,
                        backgroundImage: url
                    });
                }
            },
            setCopyrightText: (text: string) => {
                console.log(`[Application] Splash Copyright: ${text}`);
                if (this.splashScreenUpdateCallback) {
                    this.splashScreenUpdateCallback({
                        width: this.viewport.value.width,
                        height: this.viewport.value.height,
                        parentElement: this.rootEl,
                        copyrightText: text
                    });
                }
            },
            setDisclaimerText: (text: string) => {
                console.log(`[Application] Splash Disclaimer: ${text}`);
                if (this.splashScreenUpdateCallback) {
                    this.splashScreenUpdateCallback({
                        width: this.viewport.value.width,
                        height: this.viewport.value.height,
                        parentElement: this.rootEl,
                        disclaimerText: text
                    });
                }
            },
            destroy: () => {
                console.log('[Application] Splash screen destroyed');
                if (this.splashScreenUpdateCallback) {
                    this.splashScreenUpdateCallback(null);
                }
            },
            element: { style: { display: 'none' } }
        };
    }
    private async handleGameResLoadError(error: Error, strings: Strings, fatal: boolean = false): Promise<void> {
        let errorMessage = strings.get("ts:import_load_files_failed");
        if (error.name === "ChecksumError") {
            const fileField = (error as any).file || '';
            const template = strings.get("ts:import_checksum_mismatch");
            const replaced = template.indexOf("%s") >= 0 ?
                template.replace(/%s/g, fileField) :
                template + " " + fileField;
            errorMessage += "\n\n" + replaced;
        }
        else if (error.name === "FileNotFoundError") {
            const fileField = (error as any).file || '';
            const template = strings.get("ts:import_file_not_found");
            const replaced = template.indexOf("%s") >= 0 ?
                template.replace(/%s/g, fileField) :
                template + " " + fileField;
            errorMessage += "\n\n" + replaced;
        }
        else if (error.name === "DownloadError" || error.message?.match(/XHR error|Failed to fetch/i)) {
            errorMessage += "\n\n" + strings.get("ts:downloadfailed");
        }
        else if (error.name === "NoStorageError") {
            errorMessage += "\n\n" + strings.get("ts:import_no_storage");
        }
        else if (error.message?.match(/out of memory|allocation/i)) {
            errorMessage += "\n\n" + strings.get("ts:gameinitoom");
        }
        else if (error.name === "QuotaExceededError" || error.name === "StorageQuotaError") {
            errorMessage += "\n\n" + strings.get("ts:storage_quota_exceeded");
        }
        else if (error.name === "IOError") {
            errorMessage += "\n\n" + strings.get("ts:storage_io_error");
            fatal = true;
        }
        else {
            console.error("Unrecognized GameRes error:", error);
            const wrappedError = new Error(`Game res load failed (${error.message ?? error.name})`);
            (wrappedError as any).cause = error;
            this.sentry?.captureException(wrappedError);
        }
        if (this.gui && this.gui.getRootController()) {
            try {
                const messageBoxApi = this.gui.getMessageBoxApi();
                await messageBoxApi.alert(errorMessage, strings.get("GUI:OK"));
            }
            catch (e) {
                console.error("Failed to show error dialog:", e);
                const errorBox = new BasicErrorBoxApi(this.viewport, strings, this.rootEl!);
                await errorBox.show(errorMessage, fatal);
            }
        }
        else {
            const errorBox = new BasicErrorBoxApi(this.viewport, strings, this.rootEl!);
            await errorBox.show(errorMessage, fatal);
        }
    }
    private async handleGameResImportError(error: Error, strings: Strings): Promise<void> {
        let errorMessage = strings.get("ts:import_failed");
        if (error.name === "FileNotFoundError") {
            const fileField = (error as any).file || '';
            const template = strings.get("ts:import_file_not_found");
            const replaced = template.indexOf("%s") >= 0 ?
                template.replace(/%s/g, fileField) :
                template + " " + fileField;
            errorMessage += "\n\n" + replaced;
        }
        else if (error.name === "InvalidArchiveError") {
            errorMessage += "\n\n" + strings.get("ts:import_invalid_archive");
        }
        else if (error.name === "ArchiveExtractionError") {
            if ((error as any).cause?.message?.match(/out of memory|allocation/i)) {
                errorMessage += "\n\n" + strings.get("ts:import_out_of_memory");
            }
            else {
                errorMessage += "\n\n" + strings.get("ts:import_archive_extract_failed");
                const wrappedError = new Error(`Game res import failed (${error.message ?? error.name})`);
                (wrappedError as any).cause = error;
                this.sentry?.captureException(wrappedError);
            }
        }
        else if (error.name === "NoWebAssemblyError") {
            errorMessage += "\n\n" + strings.get("ts:import_no_web_assembly");
        }
        else if (error.name === "ChecksumError") {
            const fileField = (error as any).file || '';
            const template = strings.get("ts:import_checksum_mismatch");
            const replaced = template.indexOf("%s") >= 0 ?
                template.replace(/%s/g, fileField) :
                template + " " + fileField;
            errorMessage += "\n\n" + replaced;
        }
        else if (error.name === "DownloadError" || error.message?.match(/XHR error|Failed to fetch|CompileError: WebAssembly|SystemJS|NetworkError|Load failed/i)) {
            errorMessage += "\n\n" + strings.get("ts:downloadfailed");
        }
        else if (error.name === "ArchiveDownloadError") {
            const urlField = (error as any).url || '';
            const template = strings.get("ts:import_archive_download_failed");
            const replaced = template.indexOf("%s") >= 0 ?
                template.replace(/%s/g, urlField) :
                template + " " + urlField;
            errorMessage = replaced;
        }
        else if (error.name === "NoStorageError") {
            errorMessage += "\n\n" + strings.get("ts:import_no_storage");
        }
        else if (error.message?.match(/out of memory|allocation/i) || error.name.match(/NS_ERROR_FAILURE|NS_ERROR_OUT_OF_MEMORY/)) {
            errorMessage += "\n\n" + strings.get("ts:import_out_of_memory");
        }
        else if (error.name === "QuotaExceededError" || error.name === "StorageQuotaError") {
            errorMessage += "\n\n" + strings.get("ts:storage_quota_exceeded");
        }
        else if (error.name !== "IOError" && error.name !== "FileNotFoundError" && error.name !== "AbortError") {
            const wrappedError = new Error("Game res import failed " + (error.message ?? error.name));
            (wrappedError as any).cause = error;
            this.sentry?.captureException(wrappedError);
        }
        if (this.gui && this.gui.getRootController()) {
            try {
                const messageBoxApi = this.gui.getMessageBoxApi();
                await messageBoxApi.alert(errorMessage, strings.get("GUI:OK"));
            }
            catch (e) {
                console.error("Failed to show error dialog:", e);
                const errorBox = new BasicErrorBoxApi(this.viewport, strings, this.rootEl!);
                await errorBox.show(errorMessage, false);
            }
        }
        else {
            const errorBox = new BasicErrorBoxApi(this.viewport, strings, this.rootEl!);
            await errorBox.show(errorMessage, false);
        }
    }
}
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}
