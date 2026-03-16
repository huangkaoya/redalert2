import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../../engine/Engine';
import AppLogger from '../../util/Logger';
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
const GameResourcesViewer: React.FC = () => {
    const [explorerLoaded, setExplorerLoaded] = useState(false);
    const [fsalibLoaded, setFsalibLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [storageDirHandle, setStorageDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [fileSystemChanged, setFileSystemChanged] = useState(false);
    const fileExplorerContainerRef = useRef<HTMLDivElement>(null);
    const fileExplorerInstanceRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            AppLogger.info('[GameResourcesViewer] file-explorer.js loaded');
            setExplorerLoaded(true);
            if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
                AppLogger.info('[GameResourcesViewer] fsalib available');
                setFsalibLoaded(true);
            }
            else {
                AppLogger.warn('[GameResourcesViewer] fsalib not immediately available, checking...');
                setTimeout(() => {
                    if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
                        AppLogger.info('[GameResourcesViewer] fsalib became available');
                        setFsalibLoaded(true);
                    }
                    else {
                        AppLogger.error('[GameResourcesViewer] fsalib still not available');
                        setError('fsalib.min.js not loaded. IndexedDB features unavailable.');
                    }
                }, 1000);
            }
        };
        script.onerror = () => {
            AppLogger.error('[GameResourcesViewer] Failed to load file-explorer.js');
            setError('Failed to load file-explorer.js.');
        };
        document.body.appendChild(script);
        initializeStorageHandle();
        return () => {
            document.head.removeChild(cssLink);
            document.body.removeChild(script);
            if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
                fileExplorerInstanceRef.current.Destroy();
                fileExplorerInstanceRef.current = null;
            }
        };
    }, []);
    const initializeStorageHandle = () => {
        try {
            if (Engine.rfs) {
                const rootDirHandle = Engine.rfs.getRootDirectoryHandle();
                if (rootDirHandle) {
                    setStorageDirHandle(rootDirHandle);
                    AppLogger.info('[GameResourcesViewer] Storage directory handle obtained from Engine.rfs');
                }
                else {
                    AppLogger.warn('[GameResourcesViewer] Engine.rfs.getRootDirectoryHandle() returned null');
                    setError('No storage directory handle available');
                }
            }
            else {
                AppLogger.warn('[GameResourcesViewer] Engine.rfs not available');
                setError('Real File System (RFS) not initialized');
            }
        }
        catch (e: any) {
            AppLogger.error('[GameResourcesViewer] Error getting storage directory handle:', e);
            setError(`Failed to get storage handle: ${e.message}`);
        }
    };
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
    const getEntriesFromDirHandle = async (dirHandle: FileSystemDirectoryHandle, currentPath: string = '/'): Promise<ExplorerEntry[]> => {
        const entries: ExplorerEntry[] = [];
        try {
            AppLogger.debug(`[GameResourcesViewer] Reading entries from: ${dirHandle.name}, path: ${currentPath}`);
            for await (const [name, handle] of dirHandle.entries()) {
                const entryPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                const fileHandle = handle as FileSystemFileHandle;
                const itemFile = handle.kind === 'file' ? await fileHandle.getFile() : null;
                const entry: ExplorerEntry = {
                    id: name,
                    name: name,
                    type: handle.kind === 'directory' ? 'folder' : 'file',
                    hash: name,
                    attrs: isSystemFile(entryPath) ?
                        { canmodify: false } :
                        { canmodify: true },
                    ...(handle.kind === 'file' ? { size: itemFile?.size } : {}),
                    tooltip: handle.kind === 'file' ?
                        `File: ${name} (${formatFileSize(itemFile?.size || 0)})` :
                        `Folder: ${name}`,
                };
                entries.push(entry);
            }
        }
        catch (e: any) {
            AppLogger.error(`[GameResourcesViewer] Error reading entries:`, e);
            setError(`Error reading directory: ${e.message}`);
        }
        return entries.sort((a, b) => {
            if (a.type === b.type)
                return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
    };
    const navigateToPath = async (pathSegments: string[], rootHandle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> => {
        let currentHandle = rootHandle;
        for (const segment of pathSegments.slice(1)) {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
        }
        return currentHandle;
    };
    const initializeStorageExplorer = async () => {
        if (!explorerLoaded || !fsalibLoaded || !storageDirHandle) {
            setError('File explorer, fsalib, or storage handle not ready');
            return;
        }
        setError(null);
        setMessage(null);
        setIsLoading(true);
        try {
            if (fileExplorerInstanceRef.current) {
                fileExplorerInstanceRef.current.Destroy();
                fileExplorerInstanceRef.current = null;
            }
            setMessage('游戏资源存储浏览器已初始化');
            if (window.FileExplorer && fileExplorerContainerRef.current) {
                const explorerOptions = {
                    initpath: [['', 'Game Storage', { canmodify: !isSystemFile('/') }]],
                    onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
                        AppLogger.info('[GameResourcesViewer] Storage onrefresh', feFolder.GetPath());
                        feFolder.SetBusyRef(1);
                        try {
                            const path = feFolder.GetPath();
                            const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== 'Game Storage');
                            const currentPath = '/' + pathSegments.join('/');
                            AppLogger.info(`[GameResourcesViewer] Navigating to path: ${currentPath}`);
                            const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                            const entries = await getEntriesFromDirHandle(currentDirHandle, currentPath);
                            AppLogger.info(`[GameResourcesViewer] Found ${entries.length} entries`);
                            feFolder.SetEntries(entries);
                        }
                        catch (e: any) {
                            AppLogger.error('[GameResourcesViewer] Storage onrefresh error:', e);
                            feFolder.SetEntries([]);
                        }
                        finally {
                            feFolder.SetBusyRef(-1);
                        }
                    },
                    onopenfile: (feFolder: any, entry: ExplorerEntry) => {
                        AppLogger.info('[GameResourcesViewer] Storage file open:', entry);
                        const path = feFolder.GetPath().map((p: any) => p[1]).join('/');
                        setMessage(`打开文件: ${entry.name} (路径: ${path}/${entry.name})`);
                    },
                    onnewfolder: async (callback: (result: any) => void, feFolder: any) => {
                        const folderName = prompt('输入新文件夹名称:');
                        if (folderName) {
                            try {
                                const path = feFolder.GetPath();
                                const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== 'Game Storage');
                                const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                                await currentDirHandle.getDirectoryHandle(folderName, { create: true });
                                AppLogger.info(`[GameResourcesViewer] Created folder: ${folderName}`);
                                callback({ id: folderName, name: folderName, type: 'folder', hash: folderName });
                                setFileSystemChanged(true);
                            }
                            catch (e: any) {
                                AppLogger.error('[GameResourcesViewer] Error creating folder:', e);
                                callback(false);
                            }
                        }
                        else {
                            callback(false);
                        }
                    },
                    ondelete: async (callback: (errorMsg: string | false) => void, feFolder: any, itemIds: string[]) => {
                        const path = feFolder.GetPath();
                        const pathSegments = path.map((p: any) => p[1]).filter((s: string) => s !== 'Game Storage');
                        const currentPath = '/' + pathSegments.join('/');
                        const systemFiles = itemIds.filter(itemId => {
                            const itemPath = currentPath === '/' ? `/${itemId}` : `${currentPath}/${itemId}`;
                            return isSystemFile(itemPath);
                        });
                        let filesToDelete = [...itemIds];
                        if (systemFiles.length > 0) {
                            const confirmSystemDelete = confirm(`文件 "${systemFiles.join(', ')}" 是系统文件。删除它们可能导致游戏无法正常工作。\n\n您确定要继续吗？`);
                            if (!confirmSystemDelete) {
                                callback('取消删除系统文件');
                                return;
                            }
                        }
                        if (confirm(`您确定要永久删除这 ${filesToDelete.length} 个项目吗？`)) {
                            try {
                                const currentDirHandle = await navigateToPath(['', ...pathSegments], storageDirHandle);
                                for (const itemId of filesToDelete) {
                                    await currentDirHandle.removeEntry(itemId, { recursive: true });
                                    AppLogger.info(`[GameResourcesViewer] Deleted: ${itemId}`);
                                }
                                callback(false);
                                setFileSystemChanged(true);
                            }
                            catch (e: any) {
                                AppLogger.error('[GameResourcesViewer] Error deleting items:', e);
                                callback(e.message);
                            }
                        }
                        else {
                            callback('用户取消删除操作');
                        }
                    }
                };
                fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
                AppLogger.info('[GameResourcesViewer] Storage FileExplorer created');
            }
        }
        catch (err: any) {
            AppLogger.error('[GameResourcesViewer] Error initializing storage explorer:', err);
            setError(`存储浏览器错误: ${err.message}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleFileUpload = async () => {
        if (!fileInputRef.current?.files?.length || !storageDirHandle) {
            setMessage('请先选择文件');
            return;
        }
        const file = fileInputRef.current.files[0];
        setIsLoading(true);
        setMessage(`正在上传 ${file.name}...`);
        try {
            const fileHandle = await storageDirHandle.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable({ keepExistingData: false });
            await writable.write(file);
            await writable.close();
            setMessage(`文件 ${file.name} 上传成功!`);
            setFileSystemChanged(true);
            if (fileExplorerInstanceRef.current?.RefreshFolders) {
                fileExplorerInstanceRef.current.RefreshFolders(true);
            }
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
        catch (err: any) {
            AppLogger.error('[GameResourcesViewer] Upload error:', err);
            setError(`上传失败: ${err.message}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    const getSystemStatus = () => {
        const vfsStatus = Engine.vfs ? '✅ 已初始化' : '❌ 未初始化';
        const rfsStatus = Engine.rfs ? '✅ 已初始化' : '❌ 未初始化';
        const vfsArchiveCount = Engine.vfs ? Engine.vfs.listArchives().length : 0;
        const storageReady = !!storageDirHandle;
        return { vfsStatus, rfsStatus, vfsArchiveCount, storageReady };
    };
    const { vfsStatus, rfsStatus, vfsArchiveCount, storageReady } = getSystemStatus();
    return (<div style={{
            height: '100vh',
            overflow: 'auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box'
        }}>
      <h1>RA2 Web - 游戏资源存储浏览器</h1>
      
      
      <div style={{ marginBottom: '20px' }}>
        <h2>系统状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>虚拟文件系统 (VFS)</strong>
            <div>状态: {vfsStatus}</div>
            <div>归档数量: {vfsArchiveCount}</div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>真实文件系统 (RFS)</strong>
            <div>状态: {rfsStatus}</div>
            <div>存储句柄: {storageReady ? '✅ 就绪' : '❌ 未就绪'}</div>
          </div>

          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>文件浏览器</strong>
            <div>状态: {explorerLoaded ? '✅ 已加载' : '❌ 未加载'}</div>
            <div>IndexedDB: {fsalibLoaded ? '✅ 可用' : '❌ 不可用'}</div>
          </div>
        </div>
      </div>

      
      <div style={{ marginBottom: '20px' }}>
        <h2>存储浏览器控制</h2>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={initializeStorageExplorer} disabled={!explorerLoaded || !fsalibLoaded || !storageReady || isLoading} style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: storageReady ? '#007cba' : '#ccc',
            color: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            cursor: storageReady ? 'pointer' : 'not-allowed'
        }}>
            {isLoading ? '初始化中...' : '初始化存储浏览器'}
          </button>
          
          <button onClick={() => location.reload()} disabled={!fileSystemChanged} style={{
            padding: '10px 20px',
            backgroundColor: fileSystemChanged ? '#dc3545' : '#ccc',
            color: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            cursor: fileSystemChanged ? 'pointer' : 'not-allowed'
        }}>
            {fileSystemChanged ? '退出并重新加载' : '重新加载（未修改）'}
          </button>
        </div>

        {storageReady && (<div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <input type="file" ref={fileInputRef} style={{ marginRight: '10px' }}/>
            <button onClick={handleFileUpload} disabled={isLoading} style={{
                padding: '5px 15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
            }}>
              {isLoading ? '上传中...' : '上传文件到根目录'}
            </button>
          </div>)}
      </div>

      
      {error && (<div style={{
                padding: '10px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #ffcdd2'
            }}>
          错误: {error}
        </div>)}
      
      {message && (<div style={{
                padding: '10px',
                backgroundColor: '#e8f5e8',
                color: '#2e7d32',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #c8e6c9'
            }}>
          {message}
        </div>)}

      {fileSystemChanged && (<div style={{
                padding: '10px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #ffeaa7'
            }}>
          ⚠️ 文件系统已修改。建议重新加载应用以确保更改生效。
        </div>)}

      
      <div ref={fileExplorerContainerRef} className="storage-explorer" style={{
            marginTop: '20px',
            border: '2px solid #ccc',
            borderRadius: '5px',
            minHeight: '500px',
            backgroundColor: '#f9f9f9'
        }}>
        {!explorerLoaded && (<div style={{ padding: '20px', textAlign: 'center' }}>
            <p>正在加载文件浏览器组件...</p>
          </div>)}
        {explorerLoaded && !storageReady && (<div style={{ padding: '20px', textAlign: 'center' }}>
            <p>等待存储系统就绪...</p>
            <p>请确保游戏资源已导入且RFS系统正常初始化。</p>
          </div>)}
        {explorerLoaded && storageReady && !fileExplorerInstanceRef.current && (<div style={{ padding: '20px', textAlign: 'center' }}>
            <p>点击"初始化存储浏览器"开始浏览游戏资源文件。</p>
            <p>这里显示的是IndexedDB中存储的游戏文件，包括导入的.mix文件等。</p>
          </div>)}
      </div>

      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>使用说明</h3>
        <ul>
          <li><strong>存储浏览器</strong>: 浏览IndexedDB中存储的游戏资源文件</li>
          <li><strong>系统文件</strong>: .mix、.bag、.ini等核心游戏文件受保护，删除前会警告</li>
          <li><strong>文件操作</strong>: 支持上传、删除、新建文件夹等操作</li>
          <li><strong>调试工具</strong>: 此组件用于调试mix文件读取问题和资源管理</li>
          <li><strong>原项目一致</strong>: 与原项目【选项】→【存储】功能完全一致</li>
        </ul>
      </div>
    </div>);
};
function formatFileSize(bytes: number): string {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
export default GameResourcesViewer;
