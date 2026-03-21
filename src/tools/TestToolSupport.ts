import { DataStream } from '@/data/DataStream';
import { MapFile } from '@/data/MapFile';
import { MixFile } from '@/data/MixFile';
import { Engine } from '@/engine/Engine';
import { ResourceType, theaterSpecificResources } from '@/engine/resourceConfigs';
import { TheaterType } from '@/engine/TheaterType';
import { MapFileLoader } from '@/gui/screen/game/MapFileLoader';
import { Renderer } from '@/engine/gfx/Renderer';

type CdnLoader = {
    loadResources: (resources: ResourceType[], cancellationToken?: any, onProgress?: (progress: number) => void) => Promise<any>;
    getResourceFileName: (resourceType: ResourceType) => string;
};

type MapResourceLoader = {
    loadBinary: (fileName: string, cancellationToken?: any) => Promise<ArrayBuffer>;
};

export interface TestToolRuntimeContext {
    cdnResourceLoader?: CdnLoader;
    mapResourceLoader?: MapResourceLoader;
    rootElement?: HTMLElement;
}

export class TestToolSupport {
    private static panel?: HTMLDivElement;
    private static panelBody?: HTMLPreElement;
    private static activeTool?: string;
    private static fallbackHost?: HTMLDivElement;
    private static readonly panelBackground = 'linear-gradient(180deg, rgba(120, 8, 8, 0.94), rgba(50, 0, 0, 0.94))';
    private static readonly panelBorder = '1px solid #ff6400';
    private static readonly panelTextColor = '#ffd84a';

    static async ensureResourceTypes(resourceTypes: ResourceType[], cdnResourceLoader?: CdnLoader): Promise<string[]> {
        if (!Engine.vfs) {
            throw new Error('VFS not initialized');
        }
        const missingTypes: ResourceType[] = [];
        const loadedArchives: string[] = [];
        for (const resourceType of resourceTypes) {
            const fileName = cdnResourceLoader
                ? cdnResourceLoader.getResourceFileName(resourceType)
                : this.getResourceFileName(resourceType);
            loadedArchives.push(fileName);
            if (!Engine.vfs.hasArchive(fileName)) {
                missingTypes.push(resourceType);
            }
        }
        if (!missingTypes.length) {
            return loadedArchives;
        }
        if (cdnResourceLoader) {
            const resources = await cdnResourceLoader.loadResources(missingTypes);
            for (const resourceType of missingTypes) {
                const fileName = cdnResourceLoader.getResourceFileName(resourceType);
                if (Engine.vfs.hasArchive(fileName)) {
                    continue;
                }
                const bytes = resources.pop(resourceType);
                Engine.vfs.addArchive(new MixFile(new DataStream(bytes)), fileName);
            }
            return loadedArchives;
        }
        for (const resourceType of missingTypes) {
            const fileName = this.getResourceFileName(resourceType);
            await Engine.vfs.addMixFile(fileName);
        }
        return loadedArchives;
    }

    static async ensureTheater(theaterType: TheaterType, cdnResourceLoader?: CdnLoader, extraResources: ResourceType[] = []): Promise<void> {
        const theaterResources = theaterSpecificResources.get(theaterType) ?? [];
        await this.ensureResourceTypes([...extraResources, ...theaterResources], cdnResourceLoader);
    }

    static async ensureAudio(cdnResourceLoader?: CdnLoader): Promise<void> {
        await this.ensureResourceTypes([ResourceType.Sounds], cdnResourceLoader);
        if (!Engine.vfs) {
            throw new Error('VFS not initialized');
        }
        if (!Engine.vfs.hasArchive('audio.bag') && Engine.vfs.fileExists('audio.bag')) {
            await Engine.vfs.addBagFile('audio.bag');
        }
    }

    static async loadMap(mapResourceLoader: MapResourceLoader, filename: string): Promise<MapFile> {
        const loader = new MapFileLoader(mapResourceLoader, Engine.vfs);
        const mapFile = await loader.load(filename);
        return new MapFile(mapFile);
    }

    static getExistingFiles(fileNames: string[]): string[] {
        if (!Engine.vfs) {
            return [];
        }
        return fileNames.filter((fileName) => Engine.vfs?.fileExists(fileName));
    }

    static prepareHost(context: TestToolRuntimeContext, width: number, height: number): HTMLElement {
        const rootElement = context.rootElement;
        if (rootElement) {
            rootElement.replaceChildren();
            rootElement.style.position = 'relative';
            rootElement.style.width = `${width}px`;
            rootElement.style.height = `${height}px`;
            rootElement.style.display = 'block';
            rootElement.style.overflow = 'visible';
            rootElement.style.transform = '';
            rootElement.style.transformOrigin = '';
            rootElement.style.willChange = '';
            rootElement.style.flex = '0 0 auto';
            return rootElement;
        }
        if (!this.fallbackHost) {
            const host = document.createElement('div');
            host.style.position = 'fixed';
            host.style.left = '50%';
            host.style.top = '50%';
            host.style.transform = 'translate(-50%, -50%)';
            host.style.zIndex = '1';
            document.body.appendChild(host);
            this.fallbackHost = host;
        }
        this.fallbackHost.replaceChildren();
        this.fallbackHost.style.width = `${width}px`;
        this.fallbackHost.style.height = `${height}px`;
        return this.fallbackHost;
    }

    static placeRendererCanvas(renderer: Renderer, left: number = 0, top: number = 0): HTMLCanvasElement {
        const canvas = renderer.getCanvas();
        canvas.style.position = 'absolute';
        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;
        canvas.style.display = 'block';
        return canvas;
    }

    static applyPanelTheme(panel: HTMLElement): void {
        panel.style.background = this.panelBackground;
        panel.style.border = this.panelBorder;
        panel.style.color = this.panelTextColor;
        panel.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 120, 0, 0.18)';
        panel.querySelectorAll('button').forEach((button) => this.applyButtonTheme(button as HTMLButtonElement));
        panel.querySelectorAll('select').forEach((select) => this.applySelectTheme(select as HTMLSelectElement));
        panel.querySelectorAll('a').forEach((link) => this.applyLinkTheme(link as HTMLAnchorElement));
        panel.querySelectorAll('input').forEach((input) => this.applyInputTheme(input as HTMLInputElement));
        panel.querySelectorAll('hr').forEach((line) => {
            const hr = line as HTMLHRElement;
            hr.style.border = '0';
            hr.style.height = '1px';
            hr.style.background = 'rgba(255, 184, 74, 0.28)';
        });
    }

    static applyHomeButtonTheme(button: HTMLButtonElement): void {
        button.style.backgroundColor = '#7f0909';
        button.style.color = this.panelTextColor;
        button.style.border = '2px solid #ff6400';
        button.style.textShadow = '0 1px 0 rgba(0, 0, 0, 0.55)';
        button.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 190, 90, 0.14)';
    }

    private static applyButtonTheme(button: HTMLButtonElement): void {
        button.style.background = 'linear-gradient(180deg, #a10d0d, #6b0000)';
        button.style.color = this.panelTextColor;
        button.style.border = '1px solid #ff6400';
        button.style.borderRadius = '2px';
        button.style.textShadow = '0 1px 0 rgba(0, 0, 0, 0.55)';
        button.style.boxShadow = 'inset 0 1px 0 rgba(255, 204, 96, 0.12)';
        button.style.minHeight = '24px';
        button.style.padding = button.style.padding || '2px 8px';
        if (!button.disabled) {
            button.style.cursor = 'pointer';
        }
    }

    private static applySelectTheme(select: HTMLSelectElement): void {
        select.style.background = '#4a0000';
        select.style.color = this.panelTextColor;
        select.style.border = '1px solid #ff6400';
        select.style.borderRadius = '2px';
        select.style.minHeight = '24px';
    }

    private static applyLinkTheme(link: HTMLAnchorElement): void {
        link.style.color = this.panelTextColor;
        link.style.background = 'rgba(110, 6, 6, 0.72)';
        link.style.border = '1px solid rgba(255, 100, 0, 0.55)';
        link.style.borderRadius = '2px';
        link.style.padding = '4px 6px';
        link.style.marginBottom = '4px';
        link.style.textDecoration = 'none';
        link.style.cursor = 'pointer';
    }

    private static applyInputTheme(input: HTMLInputElement): void {
        if (input.type === 'checkbox' || input.type === 'radio' || input.type === 'range') {
            input.style.accentColor = '#ff6400';
            return;
        }
        input.style.background = '#4a0000';
        input.style.color = this.panelTextColor;
        input.style.border = '1px solid #ff6400';
        input.style.borderRadius = '2px';
    }

    static setState(tool: string, state: Record<string, unknown>): void {
        const snapshot = {
            tool,
            state,
            archives: Engine.vfs?.listArchives?.() ?? [],
            updatedAt: Date.now(),
        };
        (window as any).__ra2test = snapshot;
        this.renderPanel(tool, snapshot);
    }

    static enumOptions(enumType: Record<string, string | number>, values: number[]): Array<{ value: number; label: string; }> {
        return values.map((value) => ({
            value,
            label: this.enumLabel(enumType, value) ?? String(value),
        }));
    }

    static enumLabel(enumType: Record<string, string | number>, value: number | undefined | null): string | null {
        if (value === undefined || value === null) {
            return null;
        }
        const label = enumType[value];
        return typeof label === 'string' ? label : String(value);
    }

    static clearState(tool: string): void {
        const currentState = (window as any).__ra2test;
        if (currentState?.tool === tool) {
            delete (window as any).__ra2test;
        }
        if (this.activeTool === tool) {
            this.panel?.remove();
            this.panel = undefined;
            this.panelBody = undefined;
            this.activeTool = undefined;
        }
    }

    private static renderPanel(tool: string, snapshot: Record<string, unknown>): void {
        if (!this.panel) {
            const panel = document.createElement('div');
            panel.style.position = 'fixed';
            panel.style.left = '10px';
            panel.style.bottom = '10px';
            panel.style.maxWidth = '420px';
            panel.style.maxHeight = '40vh';
            panel.style.overflow = 'auto';
            panel.style.padding = '10px 12px';
            panel.style.background = 'rgba(0, 0, 0, 0.78)';
            panel.style.color = '#d7f7d7';
            panel.style.border = '1px solid rgba(125, 255, 125, 0.4)';
            panel.style.borderRadius = '6px';
            panel.style.font = '12px/1.4 Menlo, Monaco, Consolas, monospace';
            panel.style.zIndex = '1003';
            panel.style.pointerEvents = 'none';
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '6px';
            title.textContent = `Test: ${tool}`;
            const body = document.createElement('pre');
            body.style.margin = '0';
            body.style.whiteSpace = 'pre-wrap';
            body.style.wordBreak = 'break-word';
            panel.appendChild(title);
            panel.appendChild(body);
            document.body.appendChild(panel);
            this.panel = panel;
            this.panelBody = body;
            this.activeTool = tool;
        }
        if (this.panel && this.activeTool !== tool) {
            this.panel.remove();
            this.panel = undefined;
            this.panelBody = undefined;
            this.activeTool = undefined;
            this.renderPanel(tool, snapshot);
            return;
        }
        if (this.panelBody) {
            this.panelBody.textContent = JSON.stringify(snapshot, null, 2);
        }
    }

    private static getResourceFileName(resourceType: ResourceType): string {
        switch (resourceType) {
            case ResourceType.IsoSnow:
                return 'isosnow.mix';
            case ResourceType.IsoTemp:
                return 'isotemp.mix';
            case ResourceType.IsoUrb:
                return 'isourb.mix';
            case ResourceType.BuildGen:
                return 'build-gen.mix';
            case ResourceType.TheaterSnow:
                return 'snow.mix';
            case ResourceType.TheaterTemp:
                return 'temperat.mix';
            case ResourceType.TheaterUrb:
                return 'urban.mix';
            case ResourceType.TheaterSnow2:
                return 'sno.mix';
            case ResourceType.TheaterTemp2:
                return 'tem.mix';
            case ResourceType.TheaterUrb2:
                return 'urb.mix';
            case ResourceType.Ui:
                return 'ui.mix';
            case ResourceType.UiAlly:
                return 'sidec01.mix';
            case ResourceType.UiSov:
                return 'sidec02.mix';
            case ResourceType.Anims:
                return 'anims.mix';
            case ResourceType.Vxl:
                return 'vxl.mix';
            case ResourceType.Cameo:
                return 'cameo.mix';
            case ResourceType.Ini:
                return 'ini.mix';
            case ResourceType.Strings:
                return 'strings.mix';
            case ResourceType.EvaAlly:
                return 'eva-ally.mix';
            case ResourceType.EvaSov:
                return 'eva-sov.mix';
            case ResourceType.Sounds:
                return 'sounds.mix';
            case ResourceType.HalloweenMix:
                return 'expandspawn09.mix';
            case ResourceType.XmasMix:
                return 'expandspawn10.mix';
            default:
                throw new Error(`Unsupported resource type ${resourceType}`);
        }
    }
}
