import React, { useEffect, useRef, useState } from 'react';
import AppLogger from '../../../util/Logger';
import { Zip } from '../../../data/zip/Zip';
import './StorageFileExplorer.css';

interface ExplorerEntry {
    id: string;
    name: string;
    type: 'folder' | 'file';
    size?: number;
    canModify: boolean;
}

interface StorageFileExplorerProps {
    rootHandle: FileSystemDirectoryHandle;
    rootLabel: string;
    startIn?: string;
    isSystemFile?: (path: string) => boolean;
    isUploadAllowed?: (path: string) => boolean;
    shouldLowerCaseFile?: (path: string) => boolean;
    onFileSystemChange?: () => void;
    onFileOpen?: (path: string, entry: ExplorerEntry) => void;
    onInfo?: (message: string) => void;
    promptForText?: (message: string) => Promise<string | undefined>;
    confirmAction?: (message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
    showAlert?: (message: string, title?: string) => Promise<void> | void;
    downloadMultiple?: (currentPath: string, items: ExplorerEntry[]) => Promise<void>;
    canCreateFolder?: (path: string, segments: string[]) => boolean;
    validateNewFolderName?: (name: string, path: string, segments: string[]) => string | undefined;
    emptyState?: React.ReactNode;
    loadingLabel?: string;
}

interface ClipboardEntryRef {
    id: string;
    type: 'folder' | 'file';
}

interface ExplorerClipboard {
    mode: 'copy' | 'cut';
    sourceSegments: string[];
    items: ClipboardEntryRef[];
}

interface PopupMenuItem {
    id: string;
    label: string;
    iconClass?: string;
    disabled?: boolean;
    active?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void | Promise<void>;
}

interface PopupMenuState {
    x: number;
    y: number;
    items: PopupMenuItem[];
    focusIndex: number;
}

interface InternalDragPayload {
    sourceSegments: string[];
    items: ClipboardEntryRef[];
}

interface PathSegmentEntry {
    label: string;
    index: number;
    segments: string[];
}

interface HistoryEntryState {
    segments: string[];
    lastSelectedId: string | null;
}

interface SelectionBoxRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

function normalizeSegments(path?: string): string[] {
    return (path ?? '')
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
}

function buildPath(segments: string[], name?: string): string {
    const parts = [...segments];
    if (name) {
        parts.push(name);
    }
    return parts.length ? `/${parts.join('/')}` : '/';
}

async function navigateToPath(rootHandle: FileSystemDirectoryHandle, segments: string[]): Promise<FileSystemDirectoryHandle> {
    let currentHandle = rootHandle;
    for (const segment of segments) {
        currentHandle = await currentHandle.getDirectoryHandle(segment);
    }
    return currentHandle;
}

async function readEntriesFromDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    isSystemFile?: (path: string) => boolean,
): Promise<ExplorerEntry[]> {
    const entries: ExplorerEntry[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
        const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        const canModify = isSystemFile ? !isSystemFile(fullPath) : true;
        if (handle.kind === 'directory') {
            entries.push({
                id: name,
                name,
                type: 'folder',
                canModify,
            });
        }
        else {
            const file = await (handle as FileSystemFileHandle).getFile();
            entries.push({
                id: name,
                name,
                type: 'file',
                size: file.size,
                canModify,
            });
        }
    }
    return entries.sort((left, right) => {
        if (left.type !== right.type) {
            return left.type === 'folder' ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
    });
}

async function downloadSingleFile(file: File) {
    if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
        const saveFileHandle = await window.showSaveFilePicker({
            suggestedName: file.name,
        });
        const writable = await saveFileHandle.createWritable();
        try {
            await writable.write(file);
            await writable.close();
        }
        catch (error) {
            if (typeof (writable as any).abort === 'function') {
                await (writable as any).abort();
            }
            throw error;
        }
        return;
    }
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function formatFileSize(bytes?: number): string {
    if (bytes === undefined) {
        return '-';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileExtension(name: string): string {
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
        return '';
    }
    return name.slice(lastDotIndex + 1).toLowerCase();
}

function getFileIconClass(entry: ExplorerEntry): string {
    if (entry.type === 'folder') {
        return 'fe_fileexplorer_item_icon_folder';
    }
    const extension = getFileExtension(entry.name);
    if (!extension) {
        return 'fe_fileexplorer_item_icon_file fe_fileexplorer_item_icon_file_no_ext';
    }
    const extLead = extension.charAt(0).toLowerCase().replace(/[^a-z0-9]/g, 'a');
    return `fe_fileexplorer_item_icon_file fe_fileexplorer_item_icon_ext_${extLead}`;
}

function getFileExtLabel(entry: ExplorerEntry): string {
    if (entry.type === 'folder') {
        return '';
    }
    return getFileExtension(entry.name).slice(0, 4).toUpperCase();
}

async function entryExists(directoryHandle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
    try {
        await directoryHandle.getFileHandle(name);
        return true;
    }
    catch {
    }
    try {
        await directoryHandle.getDirectoryHandle(name);
        return true;
    }
    catch {
    }
    return false;
}

function getCopyName(name: string, attempt: number): string {
    const lastDotIndex = name.lastIndexOf('.');
    const hasExt = lastDotIndex > 0;
    const baseName = hasExt ? name.slice(0, lastDotIndex) : name;
    const extension = hasExt ? name.slice(lastDotIndex) : '';
    const suffix = attempt === 1 ? ' - copy' : ` - copy ${attempt}`;
    return `${baseName}${suffix}${extension}`;
}

async function getAvailableCopyName(directoryHandle: FileSystemDirectoryHandle, name: string): Promise<string> {
    let attempt = 1;
    let candidate = getCopyName(name, attempt);
    while (await entryExists(directoryHandle, candidate)) {
        attempt += 1;
        candidate = getCopyName(name, attempt);
    }
    return candidate;
}

async function cloneHandleToDirectory(
    sourceHandle: FileSystemHandle,
    targetDirectoryHandle: FileSystemDirectoryHandle,
    targetName: string,
): Promise<void> {
    if (sourceHandle.kind === 'file') {
        const file = await (sourceHandle as FileSystemFileHandle).getFile();
        const targetFileHandle = await targetDirectoryHandle.getFileHandle(targetName, { create: true });
        const writable = await targetFileHandle.createWritable();
        try {
            await writable.write(file);
            await writable.close();
        }
        catch (error) {
            if (typeof (writable as any).abort === 'function') {
                await (writable as any).abort();
            }
            throw error;
        }
        return;
    }
    const targetChildDirectory = await targetDirectoryHandle.getDirectoryHandle(targetName, { create: true });
    for await (const [childName, childHandle] of (sourceHandle as FileSystemDirectoryHandle).entries()) {
        await cloneHandleToDirectory(childHandle, targetChildDirectory, childName);
    }
}

async function downloadBlob(blob: Blob, suggestedName: string) {
    if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
        const saveFileHandle = await window.showSaveFilePicker({ suggestedName });
        const writable = await saveFileHandle.createWritable();
        try {
            await writable.write(blob);
            await writable.close();
        }
        catch (error) {
            if (typeof (writable as any).abort === 'function') {
                await (writable as any).abort();
            }
            throw error;
        }
        return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function parseInternalDragPayload(dataTransfer: DataTransfer): InternalDragPayload | null {
    const raw = dataTransfer.getData('application/x-ra2-fileexplorer-items');
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as InternalDragPayload;
        if (!Array.isArray(parsed.sourceSegments) || !Array.isArray(parsed.items)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}

function parseClipboardPayload(dataTransfer: DataTransfer | null): ExplorerClipboard | null {
    if (!dataTransfer) {
        return null;
    }
    const raw = dataTransfer.getData('application/x-ra2-fileexplorer-clipboard');
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as ExplorerClipboard;
            if (parsed?.mode && Array.isArray(parsed.sourceSegments) && Array.isArray(parsed.items)) {
                return parsed;
            }
        }
        catch {
        }
    }
    const textPlain = dataTransfer.getData('text/plain');
    if (!textPlain) {
        return null;
    }
    try {
        const parsed = JSON.parse(textPlain) as { 'application/x-ra2-fileexplorer-clipboard'?: ExplorerClipboard };
        const payload = parsed?.['application/x-ra2-fileexplorer-clipboard'];
        if (payload?.mode && Array.isArray(payload.sourceSegments) && Array.isArray(payload.items)) {
            return payload;
        }
    }
    catch {
    }
    return null;
}

export const StorageFileExplorer: React.FC<StorageFileExplorerProps> = ({
    rootHandle,
    rootLabel,
    startIn,
    isSystemFile,
    isUploadAllowed,
    shouldLowerCaseFile,
    onFileSystemChange,
    onFileOpen,
    onInfo,
    promptForText,
    confirmAction,
    showAlert,
    downloadMultiple,
    canCreateFolder,
    validateNewFolderName,
    emptyState,
    loadingLabel,
}) => {
    const initialSegments = normalizeSegments(startIn);
    const [currentSegments, setCurrentSegments] = useState<string[]>(initialSegments);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntryState[]>([{
        segments: initialSegments,
        lastSelectedId: null,
    }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<ExplorerClipboard | null>(null);
    const [showPasteOverlay, setShowPasteOverlay] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [dragFolderHoverId, setDragFolderHoverId] = useState<string | null>(null);
    const [dragPathHoverIndex, setDragPathHoverIndex] = useState<number | null>(null);
    const [selectionBoxRect, setSelectionBoxRect] = useState<SelectionBoxRect | null>(null);
    const [popupMenu, setPopupMenu] = useState<PopupMenuState | null>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const navHistoryRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const itemsScrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const pathNameRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const pathOptionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const dragImageRef = useRef<HTMLDivElement | null>(null);
    const historyEntriesRef = useRef(historyEntries);
    const historyIndexRef = useRef(historyIndex);
    const browserCaptureIdRef = useRef(`fileexplorer-${Math.random().toString(36).slice(2)}`);
    const browserCaptureRefs = useRef(0);
    const browserCaptureActive = useRef(false);
    const browserScrollRestoreRef = useRef<string | undefined>();
    const selectionDragRef = useRef<{
        anchorClientX: number;
        anchorClientY: number;
        anchorContentX: number;
        anchorContentY: number;
        additive: boolean;
        baseSelectedIds: Set<string>;
        moved: boolean;
    } | null>(null);
    const selectionAutoScrollRef = useRef<{
        timerId: number | null;
        lastClientX: number;
        lastClientY: number;
    }>({
        timerId: null,
        lastClientX: 0,
        lastClientY: 0,
    });
    const currentPath = buildPath(currentSegments);

    historyEntriesRef.current = historyEntries;
    historyIndexRef.current = historyIndex;

    useEffect(() => {
        const nextSegments = normalizeSegments(startIn);
        clearSelectionAutoScroll();
        setCurrentSegments(nextSegments);
        setSelectedIds(new Set());
        setHistoryEntries([{
            segments: nextSegments,
            lastSelectedId: null,
        }]);
        setHistoryIndex(0);
        setStatusMessage('');
        setFocusedId(null);
        setClipboard(null);
        setShowPasteOverlay(false);
        setPopupMenu(null);
        setDragPathHoverIndex(null);
        setSelectionBoxRect(null);
        selectionDragRef.current = null;
    }, [rootHandle, startIn]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
                const nextEntries = await readEntriesFromDirectory(currentDirHandle, currentPath, isSystemFile);
                if (!cancelled) {
                    clearSelectionAutoScroll();
                    setEntries(nextEntries);
                    setSelectedIds(new Set());
                    setFocusedId(null);
                    setPopupMenu(null);
                    setDragPathHoverIndex(null);
                    setSelectionBoxRect(null);
                    selectionDragRef.current = null;
                }
            }
            catch (loadError: any) {
                AppLogger.error('[StorageFileExplorer] Failed to read directory:', loadError);
                if (!cancelled) {
                    clearSelectionAutoScroll();
                    setEntries([]);
                    setSelectedIds(new Set());
                    setFocusedId(null);
                    setPopupMenu(null);
                    setDragPathHoverIndex(null);
                    setSelectionBoxRect(null);
                    selectionDragRef.current = null;
                    setError(loadError?.message ?? 'Failed to read directory');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [rootHandle, currentPath, isSystemFile]);

    useEffect(() => {
        if (!popupMenu) {
            return undefined;
        }
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (target && popupRef.current?.contains(target)) {
                return;
            }
            setPopupMenu(null);
        };
        const handleWindowBlur = () => {
            setPopupMenu(null);
        };
        window.addEventListener('mousedown', handlePointerDown, true);
        window.addEventListener('blur', handleWindowBlur);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown, true);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [popupMenu]);

    useEffect(() => {
        if (!popupMenu) {
            return;
        }
        popupRef.current?.focus();
    }, [popupMenu]);

    useEffect(() => () => {
        dragImageRef.current?.remove();
        dragImageRef.current = null;
    }, []);

    useEffect(() => () => {
        browserCaptureRefs.current = 1;
        stopBrowserCapture();
    }, []);

    useEffect(() => () => {
        clearSelectionAutoScroll();
    }, []);

    const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));

    useEffect(() => {
        const lastSelectedId = historyEntries[historyIndex]?.lastSelectedId;
        if (!lastSelectedId || selectedIds.size || !entries.some((entry) => entry.id === lastSelectedId)) {
            return;
        }
        setSelectedIds(new Set([lastSelectedId]));
        focusEntry(lastSelectedId);
    }, [entries, historyEntries, historyIndex, selectedIds.size]);

    useEffect(() => {
        if (selectedIds.size === 0) {
            return;
        }
        const lastSelectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
        setHistoryEntries((prev) => prev.map((entry, index) => index === historyIndex
            ? { ...entry, lastSelectedId }
            : entry));
    }, [selectedIds, historyIndex]);

    const emitInfo = (message: string) => {
        setStatusMessage(message);
        onInfo?.(message);
    };

    const requestText = async (message: string) => {
        if (promptForText) {
            return promptForText(message);
        }
        const value = window.prompt(message);
        return value === null ? undefined : value;
    };

    const requestConfirm = async (message: string, confirmLabel?: string, cancelLabel?: string) => {
        if (confirmAction) {
            return confirmAction(message, confirmLabel, cancelLabel);
        }
        return window.confirm(message);
    };

    const showMessage = async (message: string, title?: string) => {
        if (showAlert) {
            await Promise.resolve(showAlert(message, title));
            return;
        }
        window.alert(title ? `${title}\n\n${message}` : message);
    };

    const focusEntry = (entryId: string | null) => {
        if (!entryId) {
            return;
        }
        setFocusedId(entryId);
        requestAnimationFrame(() => {
            const node = itemRefs.current.get(entryId);
            node?.focus();
            node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    };

    const focusPathSegmentByIndex = (segmentIndex: number, target: 'name' | 'opts' = 'name') => {
        requestAnimationFrame(() => {
            const node = target === 'opts'
                ? pathOptionRefs.current.get(segmentIndex) ?? pathNameRefs.current.get(segmentIndex)
                : pathNameRefs.current.get(segmentIndex) ?? pathOptionRefs.current.get(segmentIndex);
            node?.focus();
            node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    };

    const clearSelectionAutoScroll = () => {
        if (selectionAutoScrollRef.current.timerId !== null) {
            window.clearInterval(selectionAutoScrollRef.current.timerId);
            selectionAutoScrollRef.current.timerId = null;
        }
    };

    const syncSelectionAutoScroll = (clientX: number, clientY: number) => {
        selectionAutoScrollRef.current.lastClientX = clientX;
        selectionAutoScrollRef.current.lastClientY = clientY;
        const itemsScroll = itemsScrollRef.current;
        if (!selectionDragRef.current || !itemsScroll) {
            clearSelectionAutoScroll();
            return;
        }
        const itemsRect = itemsScroll.getBoundingClientRect();
        const topOverflow = Math.max(0, itemsRect.top - clientY);
        const bottomOverflow = Math.max(0, clientY - itemsRect.bottom);
        if (!topOverflow && !bottomOverflow) {
            clearSelectionAutoScroll();
            return;
        }
        const applySelectionAutoScroll = () => {
            const currentItemsScroll = itemsScrollRef.current;
            if (!selectionDragRef.current || !currentItemsScroll) {
                clearSelectionAutoScroll();
                return;
            }
            const currentRect = currentItemsScroll.getBoundingClientRect();
            const currentTopOverflow = Math.max(0, currentRect.top - selectionAutoScrollRef.current.lastClientY);
            const currentBottomOverflow = Math.max(0, selectionAutoScrollRef.current.lastClientY - currentRect.bottom);
            const scrollDelta = currentTopOverflow
                ? -Math.max(1, Math.floor(currentTopOverflow / 8) + 1)
                : currentBottomOverflow
                    ? Math.max(1, Math.floor(currentBottomOverflow / 8) + 1)
                    : 0;
            if (!scrollDelta) {
                clearSelectionAutoScroll();
                return;
            }
            const maxScrollTop = currentItemsScroll.scrollHeight - currentItemsScroll.clientHeight;
            const nextScrollTop = Math.max(0, Math.min(maxScrollTop, currentItemsScroll.scrollTop + scrollDelta));
            if (nextScrollTop === currentItemsScroll.scrollTop) {
                clearSelectionAutoScroll();
                return;
            }
            currentItemsScroll.scrollTop = nextScrollTop;
            updateSelectionBox(selectionAutoScrollRef.current.lastClientX, selectionAutoScrollRef.current.lastClientY);
        };
        if (selectionAutoScrollRef.current.timerId === null) {
            selectionAutoScrollRef.current.timerId = window.setInterval(applySelectionAutoScroll, 16);
        }
        applySelectionAutoScroll();
    };

    const openPopupMenu = (items: PopupMenuItem[], x: number, y: number) => {
        const focusIndex = Math.max(0, items.findIndex((item) => !item.disabled));
        setPopupMenu({
            x,
            y,
            items,
            focusIndex: focusIndex === -1 ? 0 : focusIndex,
        });
    };

    const activatePopupItem = async (index: number) => {
        if (!popupMenu) {
            return;
        }
        const target = popupMenu.items[index];
        if (!target || target.disabled) {
            return;
        }
        setPopupMenu(null);
        await target.onSelect();
    };

    const navigateToSegments = (segments: string[], pushHistory = true) => {
        const nextSegments = [...segments];
        selectionDragRef.current = null;
        clearSelectionAutoScroll();
        setSelectionBoxRect(null);
        setCurrentSegments(nextSegments);
        setSelectedIds(new Set());
        setFocusedId(null);
        setStatusMessage('');
        if (!pushHistory) {
            return;
        }
        const baseHistory = historyEntries.slice(0, historyIndex + 1);
        setHistoryEntries([...baseHistory, {
            segments: nextSegments,
            lastSelectedId: null,
        }]);
        setHistoryIndex(baseHistory.length);
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            const nextEntries = await readEntriesFromDirectory(currentDirHandle, currentPath, isSystemFile);
            clearSelectionAutoScroll();
            setEntries(nextEntries);
            setSelectedIds(new Set());
            setFocusedId(null);
            setStatusMessage('已刷新');
            setDragPathHoverIndex(null);
            setSelectionBoxRect(null);
            selectionDragRef.current = null;
        }
        catch (refreshError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to refresh directory:', refreshError);
            setEntries([]);
            setSelectedIds(new Set());
            setError(refreshError?.message ?? 'Failed to refresh directory');
        }
        finally {
            setLoading(false);
        }
    };

    const handleSelect = (entryId: string, additive: boolean, extendRange: boolean = false) => {
        const entryIndex = entries.findIndex((entry) => entry.id === entryId);
        if (extendRange && focusedId) {
            const focusedIndex = entries.findIndex((entry) => entry.id === focusedId);
            if (focusedIndex !== -1 && entryIndex !== -1) {
                const start = Math.min(focusedIndex, entryIndex);
                const end = Math.max(focusedIndex, entryIndex);
                setSelectedIds(new Set(entries.slice(start, end + 1).map((entry) => entry.id)));
                setFocusedId(entryId);
                return;
            }
        }
        setSelectedIds((prev) => {
            if (!additive) {
                return new Set([entryId]);
            }
            const next = new Set(prev);
            if (next.has(entryId)) {
                next.delete(entryId);
            }
            else {
                next.add(entryId);
            }
            return next;
        });
        setFocusedId(entryId);
    };

    const openEntry = async (entry: ExplorerEntry) => {
        if (entry.type === 'folder') {
            navigateToSegments([...currentSegments, entry.id]);
            return;
        }
        const nextPath = buildPath(currentSegments, entry.id);
        if (onFileOpen) {
            onFileOpen(nextPath, entry);
            emitInfo(`打开文件: ${entry.name}`);
            return;
        }
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            const fileHandle = await currentDirHandle.getFileHandle(entry.id);
            const file = await fileHandle.getFile();
            await downloadSingleFile(file);
            emitInfo(`已下载文件: ${entry.name}`);
        }
        catch (openError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to open file:', openError);
            setError(openError?.message ?? '打开文件失败');
        }
    };

    const uploadFiles = async (files: File[], targetSegments: string[] = currentSegments) => {
        if (!files.length) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const targetDirHandle = await navigateToPath(rootHandle, targetSegments);
            const skippedFiles: string[] = [];
            let modified = false;
            for (const file of files) {
                const originalPath = buildPath(targetSegments, file.name);
                if (isUploadAllowed && !isUploadAllowed(originalPath)) {
                    skippedFiles.push(file.name);
                    continue;
                }
                let fileName = file.name;
                if (shouldLowerCaseFile?.(originalPath)) {
                    fileName = fileName.toLowerCase();
                }
                let shouldOverwrite = true;
                try {
                    await targetDirHandle.getFileHandle(fileName);
                    shouldOverwrite = await requestConfirm(`文件 "${fileName}" 已存在。是否覆盖？`, '覆盖', '取消');
                }
                catch {
                }
                if (!shouldOverwrite) {
                    continue;
                }
                const fileHandle = await targetDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                try {
                    await writable.write(file);
                    await writable.close();
                    modified = true;
                }
                catch (writeError) {
                    if (typeof (writable as any).abort === 'function') {
                        await (writable as any).abort();
                    }
                    throw writeError;
                }
            }
            if (skippedFiles.length) {
                await showMessage(`以下文件不允许上传到当前目录:\n${skippedFiles.join('\n')}`, '上传已跳过');
            }
            if (modified) {
                emitInfo(`已上传 ${files.length - skippedFiles.length} 个文件`);
                onFileSystemChange?.();
                await refresh();
            }
        }
        catch (uploadError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to upload files:', uploadError);
            setError(uploadError?.message ?? '上传失败');
        }
        finally {
            setLoading(false);
        }
    };

    const handleRename = async (entry?: ExplorerEntry) => {
        const targetEntry = entry ?? selectedEntries[0];
        if (!targetEntry) {
            return;
        }
        if (!targetEntry.canModify) {
            await showMessage('当前项目不允许重命名。');
            return;
        }
        const originalPath = buildPath(currentSegments, targetEntry.id);
        const nextNameInput = (await requestText(`输入 "${targetEntry.name}" 的新名称:`))?.trim();
        if (!nextNameInput || nextNameInput === targetEntry.id) {
            return;
        }
        const nextName = shouldLowerCaseFile?.(buildPath(currentSegments, nextNameInput))
            ? nextNameInput.toLowerCase()
            : nextNameInput;
        if (targetEntry.type === 'folder') {
            const validationError = validateNewFolderName?.(nextName, currentPath, currentSegments);
            if (validationError) {
                await showMessage(validationError);
                return;
            }
        }
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            if (await entryExists(currentDirHandle, nextName)) {
                await showMessage(`"${nextName}" 已存在。`);
                return;
            }
            const sourceHandle = targetEntry.type === 'folder'
                ? await currentDirHandle.getDirectoryHandle(targetEntry.id)
                : await currentDirHandle.getFileHandle(targetEntry.id);
            await cloneHandleToDirectory(sourceHandle, currentDirHandle, nextName);
            await currentDirHandle.removeEntry(targetEntry.id, { recursive: true });
            emitInfo(`已重命名: ${targetEntry.name} -> ${nextName}`);
            onFileSystemChange?.();
            await refresh();
            focusEntry(nextName);
        }
        catch (renameError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to rename entry:', renameError);
            setError(renameError?.message ?? '重命名失败');
        }
    };

    const handleCreateFolder = async () => {
        if (canCreateFolder && !canCreateFolder(currentPath, currentSegments)) {
            await showMessage('当前目录不允许新建文件夹。');
            return;
        }
        const folderName = (await requestText('输入新文件夹名称:'))?.trim();
        if (!folderName) {
            return;
        }
        const validationError = validateNewFolderName?.(folderName, currentPath, currentSegments);
        if (validationError) {
            await showMessage(validationError);
            return;
        }
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            await currentDirHandle.getDirectoryHandle(folderName, { create: true });
            emitInfo(`已创建文件夹: ${folderName}`);
            onFileSystemChange?.();
            await refresh();
        }
        catch (createError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to create folder:', createError);
            setError(createError?.message ?? '创建文件夹失败');
        }
    };

    const handleDelete = async (entriesToDelete: ExplorerEntry[] = selectedEntries) => {
        if (!entriesToDelete.length) {
            return;
        }
        const systemFiles = entriesToDelete
            .map((entry) => buildPath(currentSegments, entry.id))
            .filter((path) => isSystemFile?.(path));
        if (systemFiles.length) {
            const confirmedSystemDelete = await requestConfirm(
                `文件 "${systemFiles.map((path) => path.split('/').pop()).join(', ')}" 是系统文件。删除它们可能导致游戏无法正常工作。\n\n您确定要继续吗？`,
                '删除',
                '取消',
            );
            if (!confirmedSystemDelete) {
                return;
            }
        }
        const confirmedDelete = await requestConfirm(
            `您确定要永久删除这 ${entriesToDelete.length} 个项目吗？`,
            '删除',
            '取消',
        );
        if (!confirmedDelete) {
            return;
        }
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            for (const entry of entriesToDelete) {
                await currentDirHandle.removeEntry(entry.id, { recursive: true });
            }
            emitInfo(`已删除 ${entriesToDelete.length} 个项目`);
            onFileSystemChange?.();
            await refresh();
        }
        catch (deleteError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to delete entries:', deleteError);
            setError(deleteError?.message ?? '删除失败');
        }
    };

    const handleDownload = async (entriesToDownload: ExplorerEntry[] = selectedEntries) => {
        if (!entriesToDownload.length) {
            return;
        }
        try {
            const currentDirHandle = await navigateToPath(rootHandle, currentSegments);
            if (entriesToDownload.length > 1 || entriesToDownload[0]?.type === 'folder') {
                if (downloadMultiple) {
                    await downloadMultiple(currentPath, entriesToDownload);
                    return;
                }
                const zip = new Zip();
                const appendHandle = async (handle: FileSystemHandle, zipPath: string) => {
                    if (handle.kind === 'directory') {
                        for await (const [childName, childHandle] of (handle as FileSystemDirectoryHandle).entries()) {
                            await appendHandle(childHandle, `${zipPath}/${childName}`);
                        }
                        return;
                    }
                    const file = await (handle as FileSystemFileHandle).getFile();
                    zip.startFile(zipPath, new Date(file.lastModified));
                    const reader = file.stream().getReader();
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) {
                            break;
                        }
                        zip.appendData(value);
                    }
                    zip.endFile();
                };
                for (const entry of entriesToDownload) {
                    const sourceHandle = entry.type === 'folder'
                        ? await currentDirHandle.getDirectoryHandle(entry.id)
                        : await currentDirHandle.getFileHandle(entry.id);
                    await appendHandle(sourceHandle, entry.id);
                }
                zip.finish();
                const reader = zip.getOutputStream().getReader();
                const chunks: Uint8Array[] = [];
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    chunks.push(value);
                }
                await downloadBlob(new Blob(chunks, { type: 'application/zip' }), 'cdexport.zip');
                emitInfo(`已打包下载 ${entriesToDownload.length} 个项目`);
                return;
            }
            const entry = entriesToDownload[0];
            const fileHandle = await currentDirHandle.getFileHandle(entry.id);
            const file = await fileHandle.getFile();
            await downloadSingleFile(file);
            emitInfo(`已下载文件: ${entry.name}`);
        }
        catch (downloadError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to download entries:', downloadError);
            if (downloadError?.name !== 'AbortError') {
                setError(downloadError?.message ?? '下载失败');
            }
        }
    };

    const handleUploadClick = () => {
        uploadInputRef.current?.click();
    };

    const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (!files.length) {
            return;
        }
        await uploadFiles(files);
        event.target.value = '';
    };

    const navigateToHistoryIndex = (nextIndex: number) => {
        const nextEntry = historyEntriesRef.current[nextIndex];
        if (!nextEntry) {
            return;
        }
        selectionDragRef.current = null;
        clearSelectionAutoScroll();
        setSelectionBoxRect(null);
        setHistoryIndex(nextIndex);
        setCurrentSegments([...nextEntry.segments]);
        setSelectedIds(new Set());
        setFocusedId(null);
        setStatusMessage('');
    };

    const handleGoBack = () => {
        const nextIndex = historyIndexRef.current - 1;
        if (nextIndex < 0) {
            return;
        }
        navigateToHistoryIndex(nextIndex);
    };

    const handleGoForward = () => {
        const nextIndex = historyIndexRef.current + 1;
        if (nextIndex >= historyEntriesRef.current.length) {
            return;
        }
        navigateToHistoryIndex(nextIndex);
    };

    const handleBrowserPopState = (event: PopStateEvent) => {
        const state = event.state as { _fileExplorerCapture?: string; _fileExplorerDirection?: 'back' | 'main' | 'forward' } | null;
        if (!state || state._fileExplorerCapture !== browserCaptureIdRef.current) {
            return;
        }
        if (state._fileExplorerDirection === 'back') {
            window.history.forward();
            handleGoBack();
            itemsScrollRef.current?.focus();
        }
        else if (state._fileExplorerDirection === 'forward') {
            window.history.back();
            handleGoForward();
            itemsScrollRef.current?.focus();
        }
    };

    const startBrowserCapture = () => {
        browserCaptureRefs.current += 1;
        if (browserCaptureActive.current) {
            return;
        }
        browserCaptureActive.current = true;
        browserScrollRestoreRef.current = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        window.history.pushState({
            _fileExplorerCapture: browserCaptureIdRef.current,
            _fileExplorerDirection: 'back',
        }, document.title);
        window.history.scrollRestoration = 'manual';
        window.history.pushState({
            _fileExplorerCapture: browserCaptureIdRef.current,
            _fileExplorerDirection: 'main',
        }, document.title);
        window.history.scrollRestoration = 'manual';
        window.history.pushState({
            _fileExplorerCapture: browserCaptureIdRef.current,
            _fileExplorerDirection: 'forward',
        }, document.title);
        window.history.scrollRestoration = 'manual';
        window.history.back();
        window.addEventListener('popstate', handleBrowserPopState, true);
    };

    const stopBrowserCapture = () => {
        if (browserCaptureRefs.current > 0) {
            browserCaptureRefs.current -= 1;
        }
        if (browserCaptureRefs.current > 0 || !browserCaptureActive.current) {
            return;
        }
        browserCaptureActive.current = false;
        window.removeEventListener('popstate', handleBrowserPopState, true);
        const state = window.history.state as { _fileExplorerCapture?: string } | null;
        if (state?._fileExplorerCapture === browserCaptureIdRef.current) {
            window.history.back();
        }
        if (browserScrollRestoreRef.current) {
            window.history.scrollRestoration = browserScrollRestoreRef.current as ScrollRestoration;
        }
    };

    const handleClipboardStage = (mode: 'copy' | 'cut', entriesToStage: ExplorerEntry[] = selectedEntries) => {
        if (!entriesToStage.length) {
            return;
        }
        setClipboard({
            mode,
            sourceSegments: [...currentSegments],
            items: entriesToStage.map((entry) => ({ id: entry.id, type: entry.type })),
        });
        setShowPasteOverlay(true);
        emitInfo(`${mode === 'copy' ? '已复制' : '已剪切'} ${entriesToStage.length} 个项目`);
    };

    const transferEntries = async (payload: InternalDragPayload, mode: 'copy' | 'cut', targetSegments: string[]) => {
        const sourcePath = buildPath(payload.sourceSegments);
        const targetPath = buildPath(targetSegments);
        if (mode === 'cut' && sourcePath === targetPath) {
            emitInfo('源目录与目标目录相同，未执行移动');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const sourceDirHandle = await navigateToPath(rootHandle, payload.sourceSegments);
            const targetDirHandle = await navigateToPath(rootHandle, targetSegments);
            let modified = false;
            for (const item of payload.items) {
                const sourceEntryPath = buildPath(payload.sourceSegments, item.id);
                if (item.type === 'folder' && targetPath.startsWith(`${sourceEntryPath}/`)) {
                    continue;
                }
                const sourceHandle = item.type === 'folder'
                    ? await sourceDirHandle.getDirectoryHandle(item.id)
                    : await sourceDirHandle.getFileHandle(item.id);
                let targetName = item.id;
                if (mode === 'copy' && sourcePath === targetPath) {
                    targetName = await getAvailableCopyName(targetDirHandle, item.id);
                }
                else if (await entryExists(targetDirHandle, targetName)) {
                    const overwrite = await requestConfirm(`"${targetName}" 已存在。是否覆盖？`, '覆盖', '取消');
                    if (!overwrite) {
                        continue;
                    }
                    await targetDirHandle.removeEntry(targetName, { recursive: true });
                }
                await cloneHandleToDirectory(sourceHandle, targetDirHandle, targetName);
                if (mode === 'cut') {
                    await sourceDirHandle.removeEntry(item.id, { recursive: true });
                }
                modified = true;
            }
            if (modified) {
                emitInfo(`${mode === 'copy' ? '已粘贴' : '已移动'} ${payload.items.length} 个项目`);
                onFileSystemChange?.();
                if (mode === 'cut' && clipboard && buildPath(clipboard.sourceSegments) === sourcePath) {
                    setClipboard(null);
                }
                await refresh();
            }
        }
        catch (pasteError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to paste entries:', pasteError);
            setError(pasteError?.message ?? '粘贴失败');
        }
        finally {
            setLoading(false);
        }
    };

    const handlePaste = async () => {
        if (!clipboard?.items.length) {
            return;
        }
        setShowPasteOverlay(false);
        await transferEntries({
            sourceSegments: clipboard.sourceSegments,
            items: clipboard.items,
        }, clipboard.mode, currentSegments);
    };

    const handleItemsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            setSelectedIds(new Set(entries.map((entry) => entry.id)));
            focusEntry(entries[0]?.id ?? null);
            return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            handleClipboardStage('copy');
            return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') {
            event.preventDefault();
            handleClipboardStage('cut');
            return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
            event.preventDefault();
            void handlePaste();
            return;
        }
        if (event.key === 'Delete' && selectedEntries.length) {
            event.preventDefault();
            void handleDelete();
            return;
        }
        if (event.key === 'F2' && selectedEntries.length === 1) {
            event.preventDefault();
            void handleRename();
            return;
        }
        if (event.key === 'Enter' && focusedId) {
            event.preventDefault();
            const targetEntry = entries.find((entry) => entry.id === focusedId);
            if (targetEntry) {
                void openEntry(targetEntry);
            }
            return;
        }
        const focusedIndex = entries.findIndex((entry) => entry.id === focusedId);
        const fallbackIndex = selectedEntries.length ? entries.findIndex((entry) => entry.id === selectedEntries[0].id) : 0;
        const activeIndex = focusedIndex === -1 ? Math.max(0, fallbackIndex) : focusedIndex;
        const itemNode = entries[activeIndex] ? itemRefs.current.get(entries[activeIndex].id) : null;
        const itemWidth = itemNode?.offsetWidth || 76;
        const containerWidth = itemsScrollRef.current?.clientWidth || itemWidth;
        const columns = Math.max(1, Math.floor(containerWidth / itemWidth));
        let nextIndex = activeIndex;
        if (event.key === 'ArrowLeft') {
            nextIndex = Math.max(0, activeIndex - 1);
        }
        else if (event.key === 'ArrowRight') {
            nextIndex = Math.min(entries.length - 1, activeIndex + 1);
        }
        else if (event.key === 'ArrowUp') {
            nextIndex = Math.max(0, activeIndex - columns);
        }
        else if (event.key === 'ArrowDown') {
            nextIndex = Math.min(entries.length - 1, activeIndex + columns);
        }
        else if (event.key === 'Home') {
            nextIndex = 0;
        }
        else if (event.key === 'End') {
            nextIndex = Math.max(0, entries.length - 1);
        }
        if (nextIndex !== activeIndex || ['Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const nextEntry = entries[nextIndex];
            if (nextEntry) {
                handleSelect(nextEntry.id, event.metaKey || event.ctrlKey, event.shiftKey);
                focusEntry(nextEntry.id);
            }
        }
    };

    const handlePopupKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!popupMenu) {
            return;
        }
        if (event.key === 'Escape' || event.key === 'Tab') {
            event.preventDefault();
            setPopupMenu(null);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            let nextIndex = popupMenu.focusIndex;
            for (let count = 0; count < popupMenu.items.length; count += 1) {
                nextIndex = (nextIndex + direction + popupMenu.items.length) % popupMenu.items.length;
                if (!popupMenu.items[nextIndex]?.disabled) {
                    setPopupMenu({ ...popupMenu, focusIndex: nextIndex });
                    break;
                }
            }
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            void activatePopupItem(popupMenu.focusIndex);
        }
    };

    const updateSelectionBox = (clientX: number, clientY: number) => {
        const dragState = selectionDragRef.current;
        const itemsScroll = itemsScrollRef.current;
        if (!dragState || !itemsScroll) {
            return;
        }
        const scrollRect = itemsScroll.getBoundingClientRect();
        const nextClientX = Math.max(scrollRect.left, Math.min(clientX, scrollRect.right));
        const nextClientY = Math.max(scrollRect.top, Math.min(clientY, scrollRect.bottom));
        const nextContentX = nextClientX - scrollRect.left + itemsScroll.scrollLeft;
        const nextContentY = nextClientY - scrollRect.top + itemsScroll.scrollTop;
        const rectLeft = Math.min(dragState.anchorContentX, nextContentX);
        const rectTop = Math.min(dragState.anchorContentY, nextContentY);
        const rectWidth = Math.abs(nextContentX - dragState.anchorContentX);
        const rectHeight = Math.abs(nextContentY - dragState.anchorContentY);
        setSelectionBoxRect({
            left: rectLeft,
            top: rectTop,
            width: rectWidth,
            height: rectHeight,
        });
        const clientRect = {
            left: Math.min(dragState.anchorClientX, nextClientX),
            right: Math.max(dragState.anchorClientX, nextClientX),
            top: Math.min(dragState.anchorClientY, nextClientY),
            bottom: Math.max(dragState.anchorClientY, nextClientY),
        };
        const nextSelectedIds = dragState.additive ? new Set(dragState.baseSelectedIds) : new Set<string>();
        for (const entry of entries) {
            const node = itemRefs.current.get(entry.id);
            if (!node) {
                continue;
            }
            const nodeRect = node.getBoundingClientRect();
            const intersects = clientRect.left <= nodeRect.right &&
                clientRect.right >= nodeRect.left &&
                clientRect.top <= nodeRect.bottom &&
                clientRect.bottom >= nodeRect.top;
            if (intersects) {
                nextSelectedIds.add(entry.id);
            }
        }
        setSelectedIds(nextSelectedIds);
        setFocusedId(nextSelectedIds.size === 1 ? Array.from(nextSelectedIds)[0] : null);
    };

    const stopSelectionBox = (clientX: number, clientY: number) => {
        const dragState = selectionDragRef.current;
        if (!dragState) {
            return;
        }
        clearSelectionAutoScroll();
        const dx = Math.abs(clientX - dragState.anchorClientX);
        const dy = Math.abs(clientY - dragState.anchorClientY);
        const moved = dragState.moved || dx > 4 || dy > 4;
        selectionDragRef.current = null;
        setSelectionBoxRect(null);
        if (!moved && !dragState.additive) {
            setSelectedIds(new Set());
            setFocusedId(null);
        }
    };

    const handleItemsMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }
        const target = event.target as HTMLElement | null;
        if (target?.closest('.fe_fileexplorer_item_wrap_inner, .fe_fileexplorer_popup_wrap')) {
            return;
        }
        const itemsScroll = itemsScrollRef.current;
        if (!itemsScroll) {
            return;
        }
        event.preventDefault();
        setPopupMenu(null);
        const scrollRect = itemsScroll.getBoundingClientRect();
        clearSelectionAutoScroll();
        selectionAutoScrollRef.current.lastClientX = event.clientX;
        selectionAutoScrollRef.current.lastClientY = event.clientY;
        selectionDragRef.current = {
            anchorClientX: event.clientX,
            anchorClientY: event.clientY,
            anchorContentX: event.clientX - scrollRect.left + itemsScroll.scrollLeft,
            anchorContentY: event.clientY - scrollRect.top + itemsScroll.scrollTop,
            additive: event.metaKey || event.ctrlKey,
            baseSelectedIds: event.metaKey || event.ctrlKey ? new Set(selectedIds) : new Set<string>(),
            moved: false,
        };
        const handleWindowMouseMove = (moveEvent: MouseEvent) => {
            const dragState = selectionDragRef.current;
            if (!dragState) {
                return;
            }
            const dx = Math.abs(moveEvent.clientX - dragState.anchorClientX);
            const dy = Math.abs(moveEvent.clientY - dragState.anchorClientY);
            if (!dragState.moved && (dx > 4 || dy > 4)) {
                dragState.moved = true;
            }
            updateSelectionBox(moveEvent.clientX, moveEvent.clientY);
            syncSelectionAutoScroll(moveEvent.clientX, moveEvent.clientY);
        };
        const handleWindowMouseUp = (upEvent: MouseEvent) => {
            window.removeEventListener('mousemove', handleWindowMouseMove, true);
            window.removeEventListener('mouseup', handleWindowMouseUp, true);
            window.removeEventListener('blur', handleWindowBlur, true);
            stopSelectionBox(upEvent.clientX, upEvent.clientY);
        };
        const handleWindowBlur = () => {
            window.removeEventListener('mousemove', handleWindowMouseMove, true);
            window.removeEventListener('mouseup', handleWindowMouseUp, true);
            window.removeEventListener('blur', handleWindowBlur, true);
            stopSelectionBox(selectionAutoScrollRef.current.lastClientX || event.clientX, selectionAutoScrollRef.current.lastClientY || event.clientY);
        };
        window.addEventListener('mousemove', handleWindowMouseMove, true);
        window.addEventListener('mouseup', handleWindowMouseUp, true);
        window.addEventListener('blur', handleWindowBlur, true);
    };

    const openHistoryMenu = () => {
        const anchorRect = navHistoryRef.current?.getBoundingClientRect();
        if (!anchorRect) {
            return;
        }
        let minIndex = Math.max(0, historyIndex - 4);
        let maxIndex = Math.min(historyEntries.length - 1, historyIndex + 4);
        if (maxIndex - minIndex < 8) {
            minIndex = Math.max(0, Math.min(minIndex, historyEntries.length - 9));
            maxIndex = Math.min(historyEntries.length - 1, minIndex + 8);
        }
        const items = historyEntries
            .slice(minIndex, maxIndex + 1)
            .map((entry, offset) => {
                const index = minIndex + offset;
                return {
                    id: `history-${index}`,
                    label: entry.segments[entry.segments.length - 1] ?? rootLabel,
                    active: index === historyIndex,
                    iconClass: index < historyIndex
                        ? 'fe_fileexplorer_popup_item_icon_back'
                        : index > historyIndex
                            ? 'fe_fileexplorer_popup_item_icon_forward'
                            : 'fe_fileexplorer_popup_item_icon_check',
                    onSelect: () => {
                        setHistoryIndex(index);
                        setCurrentSegments([...entry.segments]);
                        setSelectedIds(new Set());
                        setFocusedId(null);
                        setStatusMessage('');
                    },
                };
            })
            .reverse();
        openPopupMenu(items, Math.round(anchorRect.left), Math.round(anchorRect.bottom + 1));
    };

    const openPathSegmentMenu = async (segment: PathSegmentEntry, anchorElement: HTMLElement | null) => {
        if (!anchorElement) {
            return;
        }
        try {
            const dirHandle = await navigateToPath(rootHandle, segment.segments);
            const items: PopupMenuItem[] = [];
            const activeChildId = currentSegments[segment.index + 1];
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind !== 'directory') {
                    continue;
                }
                items.push({
                    id: `${segment.index}:${name}`,
                    label: name,
                    iconClass: 'fe_fileexplorer_popup_item_icon_folder',
                    active: activeChildId === name,
                    onSelect: () => navigateToSegments([...segment.segments, name]),
                });
            }
            items.sort((left, right) => left.label.localeCompare(right.label));
            if (!items.length) {
                items.push({
                    id: `${segment.index}:empty`,
                    label: '没有子文件夹',
                    disabled: true,
                    onSelect: () => undefined,
                });
            }
            const rect = anchorElement.getBoundingClientRect();
            openPopupMenu(items, Math.round(rect.left), Math.round(rect.bottom + 1));
        }
        catch (popupError: any) {
            AppLogger.error('[StorageFileExplorer] Failed to open path segment menu:', popupError);
            setError(popupError?.message ?? '打开路径菜单失败');
        }
    };

    const openBackgroundMenu = (x: number, y: number) => {
        openPopupMenu([
            {
                id: 'refresh',
                label: '刷新',
                onSelect: () => refresh(),
            },
            {
                id: 'new-folder',
                label: '新建文件夹',
                iconClass: 'fe_fileexplorer_popup_item_icon_folder',
                disabled: !!(canCreateFolder && !canCreateFolder(currentPath, currentSegments)),
                onSelect: () => handleCreateFolder(),
            },
            {
                id: 'upload',
                label: '上传文件',
                onSelect: () => handleUploadClick(),
            },
            {
                id: 'paste',
                label: '粘贴',
                iconClass: 'fe_fileexplorer_popup_item_icon_paste',
                disabled: !clipboard?.items.length,
                onSelect: () => handlePaste(),
            },
            {
                id: 'select-all',
                label: '全选',
                separatorBefore: true,
                disabled: !entries.length,
                onSelect: () => {
                    setSelectedIds(new Set(entries.map((entry) => entry.id)));
                    focusEntry(entries[0]?.id ?? null);
                },
            },
        ], x, y);
    };

    const openItemMenu = (entry: ExplorerEntry, x: number, y: number) => {
        const contextEntries = selectedIds.has(entry.id) && selectedEntries.length ? selectedEntries : [entry];
        const singleContextEntry = contextEntries.length === 1 ? contextEntries[0] : undefined;
        openPopupMenu([
            {
                id: 'open',
                label: entry.type === 'folder' ? '打开' : '打开/下载',
                iconClass: entry.type === 'folder' ? 'fe_fileexplorer_popup_item_icon_folder' : 'fe_fileexplorer_popup_item_icon_file',
                onSelect: () => openEntry(entry),
            },
            {
                id: 'copy',
                label: '复制',
                iconClass: 'fe_fileexplorer_popup_item_icon_copy',
                onSelect: () => handleClipboardStage('copy', contextEntries),
            },
            {
                id: 'cut',
                label: '剪切',
                iconClass: 'fe_fileexplorer_popup_item_icon_cut',
                disabled: contextEntries.some((item) => !item.canModify),
                onSelect: () => handleClipboardStage('cut', contextEntries),
            },
            {
                id: 'rename',
                label: '重命名',
                separatorBefore: true,
                disabled: !singleContextEntry || !singleContextEntry.canModify,
                onSelect: () => handleRename(singleContextEntry),
            },
            {
                id: 'download',
                label: '下载',
                iconClass: 'fe_fileexplorer_popup_item_icon_download',
                onSelect: () => handleDownload(contextEntries),
            },
            {
                id: 'delete',
                label: '删除',
                iconClass: 'fe_fileexplorer_popup_item_icon_delete',
                disabled: contextEntries.some((item) => !item.canModify),
                onSelect: () => handleDelete(contextEntries),
            },
        ], x, y);
    };

    const createDragImage = (entry: ExplorerEntry, count: number) => {
        dragImageRef.current?.remove();
        const dragImage = document.createElement('div');
        dragImage.className = 'fe_fileexplorer_floating_drag_icon_wrap';
        const inner = document.createElement('div');
        inner.className = 'fe_fileexplorer_floating_drag_icon_wrap_inner';
        if (count > 1) {
            inner.dataset.numitems = String(count);
        }
        const icon = document.createElement('div');
        icon.className = `fe_fileexplorer_item_icon ${entry.type === 'folder' ? 'fe_fileexplorer_item_icon_folder' : 'fe_fileexplorer_item_icon_file'}`;
        inner.appendChild(icon);
        dragImage.appendChild(inner);
        document.body.appendChild(dragImage);
        dragImageRef.current = dragImage;
        return dragImage;
    };

    const clearDragImage = () => {
        dragImageRef.current?.remove();
        dragImageRef.current = null;
    };

    const handleClipboardEvent = (event: React.ClipboardEvent<HTMLDivElement>, mode: 'copy' | 'cut') => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, [contenteditable="true"]')) {
            return;
        }
        if (!selectedEntries.length) {
            return;
        }
        const payload: ExplorerClipboard = {
            mode,
            sourceSegments: [...currentSegments],
            items: selectedEntries.map((entry) => ({ id: entry.id, type: entry.type })),
        };
        setClipboard(payload);
        setShowPasteOverlay(true);
        event.preventDefault();
        event.clipboardData.setData('application/x-ra2-fileexplorer-clipboard', JSON.stringify(payload));
        event.clipboardData.setData('text/plain', JSON.stringify({
            'application/x-ra2-fileexplorer-clipboard': payload,
        }));
        emitInfo(`${mode === 'copy' ? '已复制' : '已剪切'} ${selectedEntries.length} 个项目`);
    };

    const handlePasteEvent = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, [contenteditable="true"]')) {
            return;
        }
        const payload = parseClipboardPayload(event.clipboardData) ?? clipboard;
        if (!payload?.items.length) {
            return;
        }
        event.preventDefault();
        setClipboard(payload);
        setShowPasteOverlay(false);
        void transferEntries({
            sourceSegments: payload.sourceSegments,
            items: payload.items,
        }, payload.mode, currentSegments);
    };

    const breadcrumbSegments: PathSegmentEntry[] = [
        { label: rootLabel, index: -1, segments: [] },
        ...currentSegments.map((segment, index) => ({
            label: segment,
            index,
            segments: currentSegments.slice(0, index + 1),
        })),
    ];
    const focusBreadcrumbPosition = (position: number, target: 'name' | 'opts' = 'name') => {
        const segment = breadcrumbSegments[position];
        if (!segment) {
            return;
        }
        focusPathSegmentByIndex(segment.index, target);
    };
    const handlePathSegmentKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        segment: PathSegmentEntry,
        position: number,
        target: 'name' | 'opts',
    ) => {
        if (event.key === 'ArrowLeft') {
            if (position > 0) {
                event.preventDefault();
                focusBreadcrumbPosition(position - 1);
            }
            return;
        }
        if (event.key === 'ArrowRight') {
            if (position < breadcrumbSegments.length - 1) {
                event.preventDefault();
                focusBreadcrumbPosition(position + 1);
            }
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const anchorNode = pathOptionRefs.current.get(segment.index) ?? pathNameRefs.current.get(segment.index) ?? event.currentTarget;
            focusPathSegmentByIndex(segment.index, target === 'opts' ? 'opts' : 'name');
            void openPathSegmentMenu(segment, anchorNode);
            return;
        }
        if (target === 'opts' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            void openPathSegmentMenu(segment, event.currentTarget);
        }
    };
    const pasteShortcutLabel = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? 'Cmd+V' : 'Ctrl+V';
    const statusSegments = [
        selectedEntries.length ? `已选择 ${selectedEntries.length} 项` : `项目 ${entries.length} 个`,
        currentPath,
        clipboard ? `${clipboard.mode === 'copy' ? '复制板' : '剪切板'}: ${clipboard.items.length} 项` : '',
        error || statusMessage || '',
    ].filter(Boolean);

    return (
        <div
            ref={rootRef}
            className={`fe_fileexplorer_wrap${loading ? ' fe_fileexplorer_operation_in_progress' : ''}`}
            onMouseEnter={startBrowserCapture}
            onMouseLeave={stopBrowserCapture}
            onFocusCapture={startBrowserCapture}
            onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (nextTarget && rootRef.current?.contains(nextTarget)) {
                    return;
                }
                stopBrowserCapture();
            }}
            onCopy={(event) => handleClipboardEvent(event, 'copy')}
            onCut={(event) => handleClipboardEvent(event, 'cut')}
            onPaste={handlePasteEvent}
            onContextMenu={(event) => {
                if ((event.target as HTMLElement).closest('.fe_fileexplorer_item_wrap_inner, .fe_fileexplorer_popup_wrap')) {
                    return;
                }
                event.preventDefault();
                openBackgroundMenu(event.clientX, event.clientY);
            }}
        >
            <div className={`fe_fileexplorer_inner_wrap fe_fileexplorer_inner_wrap_focused${showCheckboxes ? ' fe_fileexplorer_show_item_checkboxes' : ''}`}>
                <div className="fe_fileexplorer_toolbar">
                    <div className="fe_fileexplorer_navtools">
                        <button
                            type="button"
                            className={`fe_fileexplorer_navtool_back${historyIndex < 1 ? ' fe_fileexplorer_disabled' : ''}`}
                            onClick={handleGoBack}
                            disabled={historyIndex < 1 || loading}
                            title="后退"
                            aria-label="后退"
                        />
                        <button
                            type="button"
                            className={`fe_fileexplorer_navtool_forward${historyIndex >= historyEntries.length - 1 ? ' fe_fileexplorer_disabled' : ''}`}
                            onClick={handleGoForward}
                            disabled={historyIndex >= historyEntries.length - 1 || loading}
                            title="前进"
                            aria-label="前进"
                        />
                        <button
                            ref={navHistoryRef}
                            type="button"
                            className="fe_fileexplorer_navtool_history"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                openHistoryMenu();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openHistoryMenu();
                                }
                            }}
                            title="最近访问"
                            aria-label="最近访问"
                        />
                        <button
                            type="button"
                            className={`fe_fileexplorer_navtool_up${currentSegments.length < 1 ? ' fe_fileexplorer_disabled' : ''}`}
                            onClick={() => navigateToSegments(currentSegments.slice(0, -1))}
                            disabled={currentSegments.length < 1 || loading}
                            title="上一级"
                            aria-label="上一级"
                        />
                    </div>
                    <div className="fe_fileexplorer_path_wrap">
                        <div className="fe_fileexplorer_path_icon">
                            <div className="fe_fileexplorer_path_icon_inner" />
                        </div>
                        <div className="fe_fileexplorer_path_segments_scroll_wrap">
                            <div className="fe_fileexplorer_path_segments_wrap">
                                {breadcrumbSegments.map((segment, position) => (
                                    <div
                                        key={`${segment.label}-${segment.index}`}
                                        className={`fe_fileexplorer_path_segment_wrap${dragPathHoverIndex === segment.index ? ' fe_fileexplorer_drag_hover' : ''}`}
                                        onDragOver={(event) => {
                                            const hasInternal = parseInternalDragPayload(event.dataTransfer);
                                            const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file');
                                            if (!hasInternal && !hasFiles) {
                                                return;
                                            }
                                            event.preventDefault();
                                            setDragPathHoverIndex(segment.index);
                                            event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move';
                                        }}
                                        onDragLeave={() => {
                                            if (dragPathHoverIndex === segment.index) {
                                                setDragPathHoverIndex(null);
                                            }
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            setDragActive(false);
                                            setDragPathHoverIndex(null);
                                            const targetSegments = segment.segments;
                                            const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                            if (internalPayload) {
                                                void transferEntries(internalPayload, event.ctrlKey || event.metaKey ? 'copy' : 'cut', targetSegments);
                                                return;
                                            }
                                            void uploadFiles(Array.from(event.dataTransfer.files ?? []), targetSegments);
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="fe_fileexplorer_path_name"
                                            ref={(node) => {
                                                if (node) {
                                                    pathNameRefs.current.set(segment.index, node);
                                                }
                                                else {
                                                    pathNameRefs.current.delete(segment.index);
                                                }
                                            }}
                                            onClick={() => navigateToSegments(segment.segments)}
                                            onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                                            onKeyDown={(event) => handlePathSegmentKeyDown(event, segment, position, 'name')}
                                            disabled={loading}
                                        >
                                            {segment.label}
                                        </button>
                                        <button
                                            type="button"
                                            className="fe_fileexplorer_path_opts"
                                            ref={(node) => {
                                                if (node) {
                                                    pathOptionRefs.current.set(segment.index, node);
                                                }
                                                else {
                                                    pathOptionRefs.current.delete(segment.index);
                                                }
                                            }}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                void openPathSegmentMenu(segment, event.currentTarget);
                                            }}
                                            onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                                            onKeyDown={(event) => handlePathSegmentKeyDown(event, segment, position, 'opts')}
                                            disabled={loading}
                                            title={`浏览 ${segment.label} 下的文件夹`}
                                            aria-label={`浏览 ${segment.label} 下的文件夹`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <input ref={uploadInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUploadChange} />
                <div className="fe_fileexplorer_body_wrap_outer">
                    <div className="fe_fileexplorer_body_wrap">
                        <div className="fe_fileexplorer_folder_tools_scroll_wrap">
                            <div className="fe_fileexplorer_folder_tools">
                                <button
                                    type="button"
                                    className="fe_fileexplorer_folder_tool_new_folder"
                                    onClick={() => void handleCreateFolder()}
                                    disabled={loading}
                                    title="新建文件夹"
                                    aria-label="新建文件夹"
                                />
                                <button
                                    type="button"
                                    className="fe_fileexplorer_folder_tool_upload"
                                    onClick={handleUploadClick}
                                    disabled={loading}
                                    title="上传"
                                    aria-label="上传"
                                />
                                <button
                                    type="button"
                                    className={`fe_fileexplorer_folder_tool_download${selectedEntries.length ? '' : ' fe_fileexplorer_disabled'}`}
                                    onClick={() => void handleDownload()}
                                    disabled={loading || !selectedEntries.length}
                                    title="下载"
                                    aria-label="下载"
                                />
                                <button
                                    type="button"
                                    className={`fe_fileexplorer_folder_tool_copy${selectedEntries.length ? '' : ' fe_fileexplorer_disabled'}`}
                                    onClick={() => handleClipboardStage('copy')}
                                    disabled={loading || !selectedEntries.length}
                                    title="复制"
                                    aria-label="复制"
                                />
                                <button
                                    type="button"
                                    className={`fe_fileexplorer_folder_tool_paste${clipboard?.items.length ? '' : ' fe_fileexplorer_disabled'}`}
                                    onClick={() => void handlePaste()}
                                    disabled={loading || !clipboard?.items.length}
                                    title="粘贴"
                                    aria-label="粘贴"
                                />
                                <button
                                    type="button"
                                    className={`fe_fileexplorer_folder_tool_cut${selectedEntries.length ? '' : ' fe_fileexplorer_disabled'}`}
                                    onClick={() => handleClipboardStage('cut')}
                                    disabled={loading || !selectedEntries.length}
                                    title="剪切"
                                    aria-label="剪切"
                                />
                                <button
                                    type="button"
                                    className={`fe_fileexplorer_folder_tool_delete${selectedEntries.length ? '' : ' fe_fileexplorer_disabled'}`}
                                    onClick={() => void handleDelete()}
                                    disabled={loading || !selectedEntries.length}
                                    title="删除"
                                    aria-label="删除"
                                />
                                <div className="fe_fileexplorer_folder_tool_separator" />
                                <button
                                    type="button"
                                    className="fe_fileexplorer_folder_tool_item_checkboxes"
                                    onClick={() => setShowCheckboxes((value) => !value)}
                                    disabled={loading}
                                    title="切换复选框"
                                    aria-label="切换复选框"
                                />
                            </div>
                        </div>
                        <div
                            ref={itemsScrollRef}
                            className={`fe_fileexplorer_items_scroll_wrap${dragActive ? ' fe_fileexplorer_items_scroll_wrap_drag_active' : ''}`}
                            tabIndex={0}
                            onKeyDown={handleItemsKeyDown}
                            onMouseDown={handleItemsMouseDown}
                            onDragEnter={(event) => {
                                const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                if (internalPayload) {
                                    event.preventDefault();
                                    return;
                                }
                                if (Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) {
                                    event.preventDefault();
                                    setDragActive(true);
                                }
                            }}
                            onDragOver={(event) => {
                                const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                if (internalPayload) {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move';
                                    return;
                                }
                                if (Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) {
                                    event.preventDefault();
                                    setDragActive(true);
                                }
                            }}
                            onDragLeave={(event) => {
                                if (event.currentTarget === event.target) {
                                    setDragActive(false);
                                }
                                setDragPathHoverIndex(null);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragActive(false);
                                setDragPathHoverIndex(null);
                                const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                if (internalPayload) {
                                    void transferEntries(internalPayload, event.ctrlKey || event.metaKey ? 'copy' : 'cut', currentSegments);
                                    return;
                                }
                                void uploadFiles(Array.from(event.dataTransfer.files ?? []));
                            }}
                        >
                            <div className="fe_fileexplorer_items_scroll_wrap_inner">
                                {selectionBoxRect ? (
                                    <div
                                        className="fe_fileexplorer_select_box"
                                        style={{
                                            left: `${selectionBoxRect.left}px`,
                                            top: `${selectionBoxRect.top}px`,
                                            width: `${selectionBoxRect.width}px`,
                                            height: `${selectionBoxRect.height}px`,
                                        }}
                                    />
                                ) : null}
                                {showPasteOverlay && clipboard?.items.length && !loading ? (
                                    <div
                                        className="fe_fileexplorer_items_clipboard_overlay_paste_wrap fe_fileexplorer_items_show_clipboard_overlay_paste"
                                        tabIndex={0}
                                        onClick={() => itemsScrollRef.current?.focus()}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                setShowPasteOverlay(false);
                                            }
                                        }}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            openBackgroundMenu(event.clientX, event.clientY);
                                        }}
                                    >
                                        <div className="fe_fileexplorer_items_clipboard_overlay_paste_inner_wrap">
                                            <div className="fe_fileexplorer_items_clipboard_overlay_paste_text_wrap">
                                                <div className="fe_fileexplorer_items_clipboard_overlay_paste_text">
                                                    <div className="fe_fileexplorer_items_clipboard_overlay_paste_text_big">
                                                        按 {pasteShortcutLabel} 粘贴到当前目录
                                                    </div>
                                                    <div className="fe_fileexplorer_items_clipboard_overlay_paste_text_small">
                                                        或右键打开粘贴菜单
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                {dragActive ? (
                                    <div className="fe_fileexplorer_drop_message">释放文件以上传到当前目录</div>
                                ) : null}
                                {loading ? (
                                    <div className="fe_fileexplorer_items_message_wrap">{loadingLabel ?? '加载中...'}</div>
                                ) : entries.length ? (
                                    <div className="fe_fileexplorer_items_wrap fe_fileexplorer_items_focus">
                                        {entries.map((entry) => {
                                            const selected = selectedIds.has(entry.id);
                                            const extLabel = getFileExtLabel(entry);
                                            return (
                                                <div
                                                    key={entry.id}
                                                    className={`fe_fileexplorer_item_wrap${entry.type === 'folder' ? ' fe_fileexplorer_item_folder' : ''}${selected ? ' fe_fileexplorer_item_selected' : ''}${dragFolderHoverId === entry.id ? ' fe_fileexplorer_drag_hover' : ''}`}
                                                >
                                                    <div
                                                        className="fe_fileexplorer_item_wrap_inner"
                                                        role="button"
                                                        tabIndex={0}
                                                        ref={(node) => {
                                                            if (node) {
                                                                itemRefs.current.set(entry.id, node);
                                                            }
                                                            else {
                                                                itemRefs.current.delete(entry.id);
                                                            }
                                                        }}
                                                        onClick={(event) => handleSelect(entry.id, event.metaKey || event.ctrlKey, event.shiftKey)}
                                                        onDoubleClick={() => void openEntry(entry)}
                                                        onFocus={() => setFocusedId(entry.id)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') {
                                                                event.preventDefault();
                                                                void openEntry(entry);
                                                            }
                                                        }}
                                                        title={entry.name}
                                                        draggable
                                                        onDragStart={(event) => {
                                                            const dragEntries = selectedIds.has(entry.id) ? selectedEntries : [entry];
                                                            if (!selectedIds.has(entry.id)) {
                                                                setSelectedIds(new Set([entry.id]));
                                                                setFocusedId(entry.id);
                                                            }
                                                            const payload: InternalDragPayload = {
                                                                sourceSegments: [...currentSegments],
                                                                items: dragEntries.map((item) => ({ id: item.id, type: item.type })),
                                                            };
                                                            event.dataTransfer.setData('application/x-ra2-fileexplorer-items', JSON.stringify(payload));
                                                            event.dataTransfer.effectAllowed = 'copyMove';
                                                            const dragImage = createDragImage(entry, dragEntries.length);
                                                            event.dataTransfer.setDragImage(dragImage, 24, 40);
                                                        }}
                                                        onDragEnd={() => {
                                                            clearDragImage();
                                                            setDragFolderHoverId(null);
                                                            setDragPathHoverIndex(null);
                                                        }}
                                                        onContextMenu={(event) => {
                                                            event.preventDefault();
                                                            if (!selectedIds.has(entry.id)) {
                                                                setSelectedIds(new Set([entry.id]));
                                                                setFocusedId(entry.id);
                                                            }
                                                            openItemMenu(entry, event.clientX, event.clientY);
                                                        }}
                                                        onDragOver={(event) => {
                                                            if (entry.type !== 'folder') {
                                                                return;
                                                            }
                                                            const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                                            if (internalPayload) {
                                                                event.preventDefault();
                                                                setDragFolderHoverId(entry.id);
                                                                event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move';
                                                                return;
                                                            }
                                                            if (Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) {
                                                                event.preventDefault();
                                                                setDragFolderHoverId(entry.id);
                                                            }
                                                        }}
                                                        onDragLeave={() => {
                                                            if (dragFolderHoverId === entry.id) {
                                                                setDragFolderHoverId(null);
                                                            }
                                                        }}
                                                        onDrop={(event) => {
                                                            if (entry.type !== 'folder') {
                                                                return;
                                                            }
                                                            event.preventDefault();
                                                            setDragActive(false);
                                                            setDragFolderHoverId(null);
                                                            const internalPayload = parseInternalDragPayload(event.dataTransfer);
                                                            if (internalPayload) {
                                                                void transferEntries(internalPayload, event.ctrlKey || event.metaKey ? 'copy' : 'cut', [...currentSegments, entry.id]);
                                                                return;
                                                            }
                                                            void uploadFiles(Array.from(event.dataTransfer.files ?? []), [...currentSegments, entry.id]);
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="fe_fileexplorer_item_checkbox"
                                                            checked={selected}
                                                            onChange={(event) => {
                                                                event.stopPropagation();
                                                                handleSelect(entry.id, true);
                                                            }}
                                                            onClick={(event) => event.stopPropagation()}
                                                        />
                                                        <div
                                                            className={`fe_fileexplorer_item_icon ${getFileIconClass(entry)}`}
                                                            data-ext={extLabel}
                                                        >
                                                            {entry.type === 'file' ? null : null}
                                                        </div>
                                                        <div className="fe_fileexplorer_item_text">{entry.name}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="fe_fileexplorer_items_message_wrap">
                                        {emptyState ?? '当前目录为空。'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`fe_fileexplorer_statusbar_wrap${statusSegments.length > 2 ? ' fe_fileexplorer_statusbar_wrap_multiline' : ''}`}>
                    <div className="fe_fileexplorer_statusbar_text_wrap">
                        {statusSegments.map((segment, index) => (
                            <div
                                key={`${segment}-${index}`}
                                className={`fe_fileexplorer_statusbar_text_segment_wrap${index === statusSegments.length - 1 ? ' fe_fileexplorer_statusbar_text_segment_wrap_last' : ''}`}
                            >
                                {segment}
                            </div>
                        ))}
                        {!statusSegments.length ? (
                            <div className="fe_fileexplorer_statusbar_text_segment_wrap fe_fileexplorer_statusbar_text_segment_wrap_last">{currentPath}</div>
                        ) : null}
                    </div>
                    <div className="fe_fileexplorer_action_wrap">
                        <button
                            type="button"
                            className="fe_fileexplorer_open_icon"
                            onClick={() => void refresh()}
                            disabled={loading}
                            title="刷新"
                            aria-label="刷新"
                        />
                    </div>
                </div>
            </div>
            {popupMenu ? (
                <div
                    ref={popupRef}
                    className="fe_fileexplorer_popup_wrap"
                    tabIndex={0}
                    style={{ left: popupMenu.x, top: popupMenu.y }}
                    onKeyDown={handlePopupKeyDown}
                >
                    <div className="fe_fileexplorer_popup_inner_wrap">
                        {popupMenu.items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {item.separatorBefore ? <div className="fe_fileexplorer_popup_item_split" /> : null}
                                <div
                                    className={`fe_fileexplorer_popup_item_wrap${item.disabled ? ' fe_fileexplorer_popup_item_disabled' : ''}${index === popupMenu.focusIndex ? ' fe_fileexplorer_popup_item_wrap_focus' : ''}`}
                                    onMouseEnter={() => setPopupMenu((current) => current ? { ...current, focusIndex: index } : current)}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => void activatePopupItem(index)}
                                >
                                    <div className="fe_fileexplorer_popup_item_icon">
                                        <div className={`fe_fileexplorer_popup_item_icon_inner${item.iconClass ? ` ${item.iconClass}` : ''}`} />
                                    </div>
                                    <div className={`fe_fileexplorer_popup_item_text${item.active ? ' fe_fileexplorer_popup_item_active' : ''}`}>
                                        {item.label}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
