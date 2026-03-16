import React, { useState, useRef, useEffect, useCallback, DragEvent, FormEvent } from 'react';
import classNames from 'classnames';
import type { Strings } from '../../data/Strings';
export interface GameResFormProps {
    closable?: boolean;
    strings: Strings;
    defaultArchiveUrl?: string;
    onDownloadArchive: (url: URL) => Promise<void> | void;
    onBrowseFolder: () => Promise<void> | void;
    onBrowseArchive: () => Promise<void> | void;
    onDrop: (dataTransfer: DataTransfer) => Promise<void> | void;
    onClose?: () => void;
}
export const GameResForm: React.FC<GameResFormProps> = ({ closable, strings, defaultArchiveUrl, onDownloadArchive, onBrowseFolder, onBrowseArchive, onDrop, onClose, }) => {
    const [dragTarget, setDragTarget] = useState<EventTarget | null | undefined>(null);
    const [archiveUrl, setArchiveUrl] = useState<string>(defaultArchiveUrl || '');
    const urlInputRef = useRef<HTMLInputElement>(null);
    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        if (event.target === dragTarget) {
            setDragTarget(null);
        }
    }, [dragTarget]);
    useEffect(() => {
        urlInputRef.current?.focus();
    }, []);
    useEffect(() => {
        const preventDefault = (event: Event) => event.preventDefault();
        globalThis.addEventListener("drop", preventDefault);
        globalThis.addEventListener("dragover", preventDefault);
        return () => {
            globalThis.removeEventListener("drop", preventDefault);
            globalThis.removeEventListener("dragover", preventDefault);
        };
    }, []);
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (archiveUrl) {
            try {
                const url = new URL(archiveUrl.trim());
                if (url.protocol !== "http:" && url.protocol !== "https:") {
                    alert(strings.get("ts:gameres_invalid_url"));
                }
                else if (url.protocol === "http:" && window.location.protocol === "https:") {
                    alert(strings.get("ts:gameres_insecure_url"));
                }
                else {
                    onDownloadArchive(url);
                }
            }
            catch (e) {
                alert(strings.get("ts:gameres_invalid_url"));
            }
        }
    };
    return (<div>
            {closable && (<div className="close-button" onClick={onClose} role="button" tabIndex={0} aria-label="Close">
                    
                </div>)}
            <div className="title">{strings.get("ts:gameres_locate_title")}</div>
            <div className="browse-container">
                <p>{strings.get("ts:gameres_import_desc")}</p>
                <form className="link-container" onSubmit={handleSubmit}>
                    <p className="link-field">
                        <label htmlFor="archiveUrlInput">{strings.get("ts:gameres_download_url")}</label>
                        <input id="archiveUrlInput" type="url" ref={urlInputRef} value={archiveUrl} onChange={(e) => setArchiveUrl(e.currentTarget.value)} placeholder="https://"/>
                    </p>
                    <p className="download-button">
                        <button type="submit" className="dialog-button" disabled={!archiveUrl?.trim()}>
                            {strings.get("ts:gameres_download_button")}
                        </button>
                    </p>
                </form>
                <div className={classNames("drop-container", { "dropzone-active": !!dragTarget })} onDragOver={(e) => e.preventDefault()} onDragEnter={(e: DragEvent<HTMLDivElement>) => {
            if (Array.from(e.dataTransfer.items).every(item => item.kind === 'file')) {
                setDragTarget(e.target);
            }
        }} onDragLeave={handleDragLeave} onDrop={(e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setDragTarget(null);
            if (Array.from(e.dataTransfer.items).every(item => item.kind === 'file')) {
                onDrop(e.dataTransfer);
            }
        }}>
                    <p className="drop-figures">
                        <img src="res/img/drag-archive.png" width="98" height="133" alt="Archive File Example"/>
                        {strings.get("ts:gameres_or")}
                        <img src="res/img/drag-folder.png" width="99" height="153" alt="Folder Example"/>
                    </p>
                    <p className="desc">
                        {strings.get("ts:gameres_drop_desc")}
                        <br />
                        {strings.get("ts:gameres_or")}
                    </p>
                    <p className="browse-buttons">
                        <button type="button" className="dialog-button" onClick={onBrowseFolder}>
                            {strings.get("ts:gameres_browse_folder")}
                        </button>
                        <button type="button" className="dialog-button" onClick={onBrowseArchive}>
                            {strings.get("ts:gameres_browse_archive")}
                        </button>
                    </p>
                    <p className="archive-formats">
                        <em>{strings.get("ts:gameres_supported_archive_formats")}</em>
                    </p>
                </div>
            </div>
        </div>);
};
