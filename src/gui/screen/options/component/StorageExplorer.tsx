import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../../../../engine/Engine';
import AppLogger from '../../../../util/Logger';
import { Strings } from '../../../../data/Strings';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
interface ExplorerEntry {
    id: string;
    name: string;
    type: 'folder' | 'file';
    hash: string;
    attrs?: {
        [key: string]: any;
        canmodify?: boolean;
    };
    size?: number;
    tooltip?: string;
    thumb?: string;
}
interface StorageExplorerProps {
    strings: Strings;
    messageBoxApi: MessageBoxApi;
    storageDirHandle: FileSystemDirectoryHandle;
    startIn?: string;
    onFileSystemChange?: () => void;
}
const StorageExplorer: React.FC<StorageExplorerProps> = ({ strings, messageBoxApi, storageDirHandle, startIn, onFileSystemChange }) => {
    const [explorerLoaded, setExplorerLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileExplorerContainerRef = useRef<HTMLDivElement>(null);
    const fileExplorerInstanceRef = useRef<any>(null);
    useEffect(() => {
        const cssLink = document.createElement('link');
        cssLink.href = '/other/file-explorer.css';
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        document.head.appendChild(cssLink);
        const script = document.createElement('script');
        script.src = '/other/file-explorer.js';
        script.async = true;
        script.onload = () => {
            AppLogger.info('[StorageExplorer] file-explorer.js loaded');
            setExplorerLoaded(true);
        };
        script.onerror = () => {
            AppLogger.error('[StorageExplorer] Failed to load file-explorer.js');
            setError('Failed to load file-explorer.js.');
        };
        document.body.appendChild(script);
        return () => {
            document.head.removeChild(cssLink);
            document.body.removeChild(script);
            if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
                fileExplorerInstanceRef.current.Destroy();
                fileExplorerInstanceRef.current = null;
            }
        };
    }, []);
    const isSystemFile = (path: string): boolean => {
        const systemPatterns: (string | RegExp)[] = [
            /^\/[^\/]*\.mix$/i,
            /^\/[^\/]*\.bag$/i,
            /^\/[^\/]*\.idx$/i,
            /^\/[^\/]*\.ini$/i,
            /^\/[^\/]*\.csf$/i,
        ];
        return systemPatterns.some(pattern => typeof pattern === 'string' ?
            path.toLowerCase() === pattern.toLowerCase() :
            pattern.test(path));
    };
    const isUploadAllowed = (path: string): boolean => {
        const allowedPatterns: (string | RegExp)[] = [
            '/keyboard.ini',
            /^\/(language|multi|ra2)\.mix$/i,
            /^\/music\/[^\/]+\.mp3$/i,
            /^\/replays\/.*$/i,
            /^\/taunts\/tau[^\/]+\.wav$/i,
            /^\/mods\/[^\/]+\/.*$/i,
            /^\/maps\/[^\/]+\.(map|mpr|yrm)$/i,
        ];
        return allowedPatterns.some(pattern => typeof pattern === 'string' ?
            path.toLowerCase() === pattern.toLowerCase() :
            pattern.test(path));
    };
    const shouldLowerCaseFile = (path: string): boolean => {
        const lowerCasePatterns: (string | RegExp)[] = [
            '/keyboard.ini',
            /^\/[^\/]+\.mix$/i,
            /^\/music\/.*$/i,
            /^\/taunts\/.*$/i,
        ];
        return lowerCasePatterns.some(pattern => typeof pattern === 'string' ?
            path.toLowerCase() === pattern.toLowerCase() :
            pattern.test(path));
    };
    const downloadSingleFile = async (feFolder: any, item: ExplorerEntry) => {
        try {
            const pathSegments = feFolder.GetPathIDs().filter((s: string) => s !== '/');
            const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
            const fileHandle = await currentDirHandle.getFileHandle(item.id);
            const file = await fileHandle.getFile();
            if ('showSaveFilePicker' in window) {
                const saveFileHandle = await (window as any).showSaveFilePicker({
                    suggestedName: file.name,
                });
                const writable = await saveFileHandle.createWritable();
                try {
                    await writable.write(file);
                    await writable.close();
                    AppLogger.info(`[StorageExplorer] File downloaded: ${item.name}`);
                }
                catch (error) {
                    await writable.abort();
                    throw error;
                }
            }
            else {
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
        catch (error: any) {
            AppLogger.error('[StorageExplorer] Single file download error:', error);
            throw error;
        }
    };
    const downloadAsZip = async (feFolder: any, items: ExplorerEntry[]) => {
        try {
            messageBoxApi.show('ZIP download feature requires additional implementation.\n\n' +
                'Currently only single file download is supported.', 'Feature Not Available');
        }
        catch (error: any) {
            AppLogger.error('[StorageExplorer] ZIP download error:', error);
            throw error;
        }
    };
    const navigateToPath = async (pathSegments: string[], rootHandle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> => {
        let currentHandle = rootHandle;
        for (const segment of pathSegments.slice(1)) {
            if (segment) {
                try {
                    currentHandle = await currentHandle.getDirectoryHandle(segment);
                }
                catch (e) {
                    AppLogger.error(`[StorageExplorer] Failed to navigate to ${segment}:`, e);
                    throw e;
                }
            }
        }
        return currentHandle;
    };
    const getEntriesFromDirHandle = async (dirHandle: FileSystemDirectoryHandle, currentPath: string = '/'): Promise<ExplorerEntry[]> => {
        const entries: ExplorerEntry[] = [];
        try {
            for await (const [name, handle] of dirHandle.entries()) {
                const itemPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                const canModify = !isSystemFile(itemPath);
                if (handle.kind === 'directory') {
                    entries.push({
                        id: name,
                        name: name,
                        type: 'folder',
                        hash: name,
                        attrs: { canmodify: canModify }
                    });
                }
                else {
                    const fileHandle = handle as FileSystemFileHandle;
                    const file = await fileHandle.getFile();
                    entries.push({
                        id: name,
                        name: name,
                        type: 'file',
                        hash: name,
                        size: file.size,
                        attrs: { canmodify: canModify }
                    });
                }
            }
        }
        catch (e: any) {
            AppLogger.error('[StorageExplorer] Error reading directory entries:', e);
        }
        return entries.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };
    const initializeStorageExplorer = async () => {
        if (!explorerLoaded || !storageDirHandle) {
            setError('File explorer or storage handle not ready');
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            if (fileExplorerInstanceRef.current) {
                fileExplorerInstanceRef.current.Destroy();
                fileExplorerInstanceRef.current = null;
            }
            AppLogger.info('[StorageExplorer] Initializing storage explorer');
            if (window.FileExplorer && fileExplorerContainerRef.current) {
                let initPath = [['', '/', { canmodify: !isSystemFile('/') }]];
                if (startIn) {
                    let currentPath = '';
                    for (const segment of startIn.split('/').filter(s => s)) {
                        currentPath += '/' + segment;
                        initPath.push([segment, segment, { canmodify: !isSystemFile(currentPath) }]);
                    }
                }
                const explorerOptions = {
                    initpath: initPath,
                    concurrentuploads: 1,
                    onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
                        AppLogger.info('[StorageExplorer] Storage onrefresh', feFolder.GetPath());
                        feFolder.SetBusyRef(1);
                        try {
                            const path = feFolder.GetPath();
                            const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== '/');
                            const currentPath = '/' + pathSegments.join('/');
                            AppLogger.info(`[StorageExplorer] Navigating to path: ${currentPath}`);
                            const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                            const entries = await getEntriesFromDirHandle(currentDirHandle, currentPath);
                            AppLogger.info(`[StorageExplorer] Found ${entries.length} entries`);
                            feFolder.SetEntries(entries);
                        }
                        catch (e: any) {
                            AppLogger.error('[StorageExplorer] Storage onrefresh error:', e);
                            feFolder.SetEntries([]);
                        }
                        finally {
                            feFolder.SetBusyRef(-1);
                        }
                    },
                    onopenfile: (feFolder: any, entry: ExplorerEntry) => {
                        AppLogger.info('[StorageExplorer] Storage file open:', entry);
                        const path = feFolder.GetPath().map((p: any) => p[1]).join('/');
                    },
                    onnewfolder: async (callback: (result: any) => void, feFolder: any) => {
                        try {
                            const folderName = await messageBoxApi.prompt(strings.get('GUI:NewFolderPrompt') || 'Enter new folder name:', strings.get('GUI:Create') || 'Create', strings.get('GUI:Cancel') || 'Cancel');
                            if (folderName) {
                                const path = feFolder.GetPath();
                                const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== '/');
                                const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                                await currentDirHandle.getDirectoryHandle(folderName, { create: true });
                                AppLogger.info(`[StorageExplorer] Created folder: ${folderName}`);
                                callback({ id: folderName, name: folderName, type: 'folder', hash: folderName });
                                onFileSystemChange?.();
                            }
                            else {
                                callback(false);
                            }
                        }
                        catch (e: any) {
                            AppLogger.error('[StorageExplorer] Error creating folder:', e);
                            callback(false);
                        }
                    },
                    ondelete: async (callback: (errorMsg: string | false) => void, feFolder: any, itemIds: string[]) => {
                        const path = feFolder.GetPath();
                        const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== '/');
                        const currentPath = '/' + pathSegments.join('/');
                        const systemFiles = itemIds.filter(itemId => {
                            const itemPath = currentPath === '/' ? `/${itemId}` : `${currentPath}/${itemId}`;
                            return isSystemFile(itemPath);
                        });
                        let filesToDelete = [...itemIds];
                        if (systemFiles.length > 0) {
                            const confirmSystemDelete = await messageBoxApi.confirm(`${strings.get('GUI:SystemFileWarning') || 'System files detected'}: "${systemFiles.join(', ')}"\n\n${strings.get('GUI:DeleteSystemFileConfirm') || 'Delete anyway?'}`, strings.get('GUI:Delete') || 'Delete', strings.get('GUI:Cancel') || 'Cancel');
                            if (!confirmSystemDelete) {
                                callback(strings.get('GUI:DeleteCancelled') || 'Delete cancelled');
                                return;
                            }
                        }
                        const confirmDelete = await messageBoxApi.confirm(`${strings.get('GUI:DeleteConfirm') || 'Delete'} ${filesToDelete.length} ${strings.get('GUI:Items') || 'items'}?`, strings.get('GUI:Delete') || 'Delete', strings.get('GUI:Cancel') || 'Cancel');
                        if (confirmDelete) {
                            try {
                                const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                                for (const itemId of filesToDelete) {
                                    await currentDirHandle.removeEntry(itemId, { recursive: true });
                                    AppLogger.info(`[StorageExplorer] Deleted: ${itemId}`);
                                }
                                callback(false);
                                onFileSystemChange?.();
                            }
                            catch (e: any) {
                                AppLogger.error('[StorageExplorer] Error deleting items:', e);
                                callback(e.message);
                            }
                        }
                        else {
                            callback(strings.get('GUI:DeleteCancelled') || 'Delete cancelled');
                        }
                    },
                    oninitupload: async (callback: (result: boolean) => void, uploadInfo: any) => {
                        try {
                            const targetPath = uploadInfo.folder.GetPathIDs().join('/') + uploadInfo.fullPath;
                            const pathSegments = targetPath.substring(0, targetPath.lastIndexOf('/')).split('/');
                            AppLogger.info(`[StorageExplorer] Uploading file to: ${targetPath}`);
                            const isAllowedPath = isUploadAllowed(targetPath);
                            if (!isAllowedPath) {
                                AppLogger.warn(`[StorageExplorer] Upload not allowed to path: ${targetPath}`);
                                callback(false);
                                return;
                            }
                            const targetDirHandle = await navigateToPath(['', ...pathSegments.filter(s => s)], storageDirHandle);
                            let shouldOverwrite = true;
                            try {
                                await targetDirHandle.getFileHandle(uploadInfo.file.name);
                                shouldOverwrite = await messageBoxApi.confirm(`File "${uploadInfo.file.name}" already exists. Overwrite?`, 'Yes', 'No');
                            }
                            catch (e) {
                            }
                            if (!shouldOverwrite) {
                                AppLogger.info(`[StorageExplorer] Upload cancelled by user: ${targetPath}`);
                                callback(false);
                                return;
                            }
                            let fileName = uploadInfo.file.name;
                            if (shouldLowerCaseFile(targetPath)) {
                                fileName = fileName.toLowerCase();
                            }
                            const fileHandle = await targetDirHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            try {
                                await writable.write(uploadInfo.file);
                                await writable.close();
                                AppLogger.info(`[StorageExplorer] File uploaded successfully: ${targetPath}`);
                                callback(false);
                                onFileSystemChange?.();
                            }
                            catch (error) {
                                await writable.abort();
                                throw error;
                            }
                        }
                        catch (error: any) {
                            AppLogger.error('[StorageExplorer] Upload error:', error);
                            let errorMessage = 'Upload failed';
                            if (error.name === 'QuotaExceededError') {
                                errorMessage = 'Upload failed: Storage quota exceeded';
                            }
                            messageBoxApi.show(errorMessage, 'Upload Error');
                            callback(false);
                        }
                    },
                    oninitdownload: async (callback: any, feFolder: any, selectedItems: any, items: ExplorerEntry[]) => {
                        try {
                            if (items.length === 1 && items[0].type === 'file') {
                                await downloadSingleFile(feFolder, items[0]);
                            }
                            else {
                                await downloadAsZip(feFolder, items);
                            }
                        }
                        catch (error: any) {
                            AppLogger.error('[StorageExplorer] Download error:', error);
                            if (error.name !== 'AbortError') {
                                messageBoxApi.show('Download failed: ' + error.message, 'Download Error');
                            }
                        }
                    }
                };
                fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
                AppLogger.info('[StorageExplorer] Storage FileExplorer created');
            }
        }
        catch (err: any) {
            AppLogger.error('[StorageExplorer] Error initializing storage explorer:', err);
            setError(`Storage explorer error: ${err.message}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (explorerLoaded && storageDirHandle) {
            initializeStorageExplorer();
        }
    }, [explorerLoaded, storageDirHandle]);
    if (error) {
        return (<div className="storage-explorer" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>{strings.get('GUI:Error') || 'Error'}</h3>
        <p style={{ color: 'red' }}>{error}</p>
      </div>);
    }
    if (isLoading) {
        return (<div className="storage-explorer" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>{strings.get('GUI:LoadingEx') || 'Loading...'}</h3>
      </div>);
    }
    return (<div className="storage-explorer">
      <div ref={fileExplorerContainerRef} style={{
            width: '100%',
            height: '100%',
            minHeight: '400px'
        }}>
        {!explorerLoaded && (<div style={{ padding: '20px', textAlign: 'center' }}>
            <p>{strings.get('GUI:LoadingFileExplorer') || 'Loading file explorer...'}</p>
          </div>)}
      </div>
    </div>);
};
export default StorageExplorer;
