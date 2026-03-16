import React from 'react';
import classNames from 'classnames';
import { HtmlReactElement } from '../HtmlReactElement';
import { Dialog, type DialogProps } from './Dialog';
import { GameResForm, type GameResFormProps } from './GameResForm';
import { FileSystemUtil } from '../../engine/gameRes/FileSystemUtil';
import type { Viewport } from '../Viewport';
import type { Strings } from '../../data/Strings';
interface FsAccessLibraryShim {
    polyfillDataTransferItem: () => Promise<void>;
    showDirectoryPicker: (options?: any) => Promise<FileSystemDirectoryHandle>;
}
export type GameResSourceSelection = FileSystemDirectoryHandle | FileSystemFileHandle | URL | undefined;
export class GameResBoxApi {
    private viewport: Viewport;
    private strings: Strings;
    private rootEl: HTMLElement;
    private fsAccessLib: FsAccessLibraryShim;
    constructor(viewport: Viewport, strings: Strings, rootEl: HTMLElement, fsAccessLib: FsAccessLibraryShim) {
        this.viewport = viewport;
        this.strings = strings;
        this.rootEl = rootEl;
        this.fsAccessLib = fsAccessLib;
    }
    async promptForGameRes(defaultArchiveUrl?: string, closable?: boolean): Promise<GameResSourceSelection> {
        console.log('[GameResBoxApi] promptForGameRes called with:', { defaultArchiveUrl, closable });
        await this.fsAccessLib.polyfillDataTransferItem();
        return new Promise<GameResSourceSelection>((resolve) => {
            let dialogElement: HtmlReactElement<DialogProps> | undefined;
            const handleResolve = (selection: GameResSourceSelection) => {
                console.log('[GameResBoxApi] Resolving with selection:', selection);
                cleanup();
                resolve(selection);
            };
            const dialogProps: DialogProps = {
                className: classNames("game-res-box"),
                buttons: [] as any[],
                children: React.createElement(GameResForm, {
                    defaultArchiveUrl: defaultArchiveUrl,
                    closable: closable,
                    strings: this.strings,
                    onDrop: async (dataTransfer: DataTransfer) => {
                        console.log('[GameResBoxApi] onDrop called');
                        if (dataTransfer.items && dataTransfer.items.length > 0) {
                            try {
                                const handle = await (dataTransfer.items[0] as any).getAsFileSystemHandle();
                                if (!handle)
                                    return;
                                handleResolve(handle as FileSystemDirectoryHandle | FileSystemFileHandle);
                            }
                            catch (e) {
                                console.error("Error getting handle from drop:", e);
                            }
                        }
                    },
                    onBrowseFolder: async () => {
                        console.log('[GameResBoxApi] onBrowseFolder called');
                        try {
                            const handle = await this.fsAccessLib.showDirectoryPicker({ _preferPolyfill: true });
                            handleResolve(handle);
                        }
                        catch (e) {
                            console.error("Error browsing folder:", e);
                        }
                    },
                    onBrowseArchive: async () => {
                        console.log('[GameResBoxApi] onBrowseArchive called');
                        try {
                            const handle = await FileSystemUtil.showArchivePicker(this.fsAccessLib as any);
                            handleResolve(handle as FileSystemFileHandle);
                        }
                        catch (e) {
                            console.error("Error browsing archive:", e);
                        }
                    },
                    onDownloadArchive: async (url: URL) => {
                        console.log('[GameResBoxApi] onDownloadArchive called with:', url);
                        handleResolve(url);
                    },
                    onClose: () => {
                        console.log('[GameResBoxApi] onClose called');
                        handleResolve(undefined);
                    },
                } as GameResFormProps),
                viewport: this.viewport.value,
                zIndex: 101,
            };
            console.log('[GameResBoxApi] Creating dialog element with props:', dialogProps);
            dialogElement = HtmlReactElement.factory(Dialog, dialogProps);
            const cleanup = () => {
                console.log('[GameResBoxApi] Cleanup called');
                if (dialogElement) {
                    const element = dialogElement.getElement();
                    if (element && this.rootEl.contains(element)) {
                        this.rootEl.removeChild(element);
                    }
                    dialogElement.unrender();
                    dialogElement = undefined;
                }
            };
            if (dialogElement) {
                console.log('[GameResBoxApi] Rendering dialog element');
                const viewportValue = this.viewport.value;
                dialogElement.setSize(viewportValue.width, viewportValue.height);
                dialogElement.render();
                const elementToAppend = dialogElement.getElement();
                if (elementToAppend) {
                    console.log('[GameResBoxApi] Appending dialog element to root:', elementToAppend);
                    this.rootEl.appendChild(elementToAppend);
                }
                else {
                    console.error("GameResBoxApi: Dialog element not created for appending.");
                    handleResolve(undefined);
                }
            }
            else {
                console.error("GameResBoxApi: Dialog could not be created.");
                handleResolve(undefined);
            }
        });
    }
}
