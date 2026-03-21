import React, { useEffect, useState } from 'react';
import { Engine } from '../../engine/Engine';
import { browserFileSystemAccess } from '../../engine/gameRes/browserFileSystemAccess';
import { StorageFileExplorer } from './fileExplorer/StorageFileExplorer';
import AppLogger from '../../util/Logger';

const GameResourcesViewer: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [storageDirHandle, setStorageDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [fileSystemChanged, setFileSystemChanged] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);

    useEffect(() => {
        try {
            if (Engine.rfs) {
                const rootDirHandle = Engine.rfs.getRootDirectoryHandle();
                if (rootDirHandle) {
                    setStorageDirHandle(rootDirHandle);
                    AppLogger.info('[GameResourcesViewer] Storage directory handle obtained from Engine.rfs');
                    return;
                }
                AppLogger.warn('[GameResourcesViewer] Engine.rfs.getRootDirectoryHandle() returned null');
                setError('No storage directory handle available');
                return;
            }
            AppLogger.warn('[GameResourcesViewer] Engine.rfs not available');
            setError('Real File System (RFS) not initialized');
        }
        catch (loadError: any) {
            AppLogger.error('[GameResourcesViewer] Error getting storage directory handle:', loadError);
            setError(`Failed to get storage handle: ${loadError.message}`);
        }
    }, []);

    const isSystemFile = (path: string): boolean => {
        const systemPatterns: (string | RegExp)[] = [
            /^\/[^\/]*\.mix$/i,
            /^\/[^\/]*\.bag$/i,
            /^\/[^\/]*\.idx$/i,
            /^\/[^\/]*\.ini$/i,
            /^\/[^\/]*\.csf$/i,
        ];
        return systemPatterns.some(pattern => typeof pattern === 'string'
            ? path.toLowerCase() === pattern.toLowerCase()
            : pattern.test(path));
    };

    const getSystemStatus = () => {
        const vfsStatus = Engine.vfs ? '✅ 已初始化' : '❌ 未初始化';
        const rfsStatus = Engine.rfs ? '✅ 已初始化' : '❌ 未初始化';
        const vfsArchiveCount = Engine.vfs ? Engine.vfs.listArchives().length : 0;
        const storageReady = !!storageDirHandle;
        const fsAccessReady = !!browserFileSystemAccess.adapters.indexeddb;
        return { vfsStatus, rfsStatus, vfsArchiveCount, storageReady, fsAccessReady };
    };

    const { vfsStatus, rfsStatus, vfsArchiveCount, storageReady, fsAccessReady } = getSystemStatus();

    return (
        <div style={{
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
                        <strong>ESM 模块</strong>
                        <div>FileSystemAccess: {fsAccessReady ? '✅ 已接入' : '❌ 不可用'}</div>
                        <div>File Explorer: ✅ TypeScript 组件</div>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2>存储浏览器控制</h2>
                <div style={{ marginBottom: '10px' }}>
                    <button
                        onClick={() => {
                            setError(null);
                            setShowExplorer(true);
                        }}
                        disabled={!storageReady}
                        style={{
                            marginRight: '10px',
                            padding: '10px 20px',
                            backgroundColor: storageReady ? '#007cba' : '#ccc',
                            color: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            cursor: storageReady ? 'pointer' : 'not-allowed'
                        }}
                    >
                        打开存储浏览器
                    </button>
                    <button
                        onClick={() => location.reload()}
                        disabled={!fileSystemChanged}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: fileSystemChanged ? '#dc3545' : '#ccc',
                            color: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            cursor: fileSystemChanged ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {fileSystemChanged ? '退出并重新加载' : '重新加载（未修改）'}
                    </button>
                </div>
            </div>

            {error ? (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '5px',
                    marginBottom: '10px',
                    border: '1px solid #ffcdd2'
                }}>
                    错误: {error}
                </div>
            ) : null}

            {message ? (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#e8f5e8',
                    color: '#2e7d32',
                    borderRadius: '5px',
                    marginBottom: '10px',
                    border: '1px solid #c8e6c9'
                }}>
                    {message}
                </div>
            ) : null}

            {fileSystemChanged ? (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '5px',
                    marginBottom: '10px',
                    border: '1px solid #ffeaa7'
                }}>
                    ⚠️ 文件系统已修改。建议重新加载应用以确保更改生效。
                </div>
            ) : null}

            <div style={{
                marginTop: '20px',
                border: '2px solid #ccc',
                borderRadius: '5px',
                minHeight: '500px',
                backgroundColor: '#f9f9f9',
                overflow: 'hidden'
            }}>
                {!showExplorer ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <p>点击“打开存储浏览器”开始浏览游戏资源文件。</p>
                        <p>这里显示的是浏览器存储中持久化的游戏文件和目录。</p>
                    </div>
                ) : storageDirHandle ? (
                    <StorageFileExplorer
                        rootHandle={storageDirHandle}
                        rootLabel="Game Storage"
                        isSystemFile={isSystemFile}
                        onFileSystemChange={() => setFileSystemChanged(true)}
                        onFileOpen={(path, entry) => setMessage(`打开文件: ${entry.name} (路径: ${path})`)}
                        onInfo={(info) => setMessage(info)}
                        promptForText={async (promptText) => {
                            const value = window.prompt(promptText);
                            return value === null ? undefined : value;
                        }}
                        confirmAction={async (confirmText) => window.confirm(confirmText)}
                        showAlert={async (alertText, title) => window.alert(title ? `${title}\n\n${alertText}` : alertText)}
                    />
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <p>等待存储系统就绪...</p>
                        <p>请确保游戏资源已导入且 RFS 系统正常初始化。</p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
                <h3>使用说明</h3>
                <ul>
                    <li><strong>存储浏览器</strong>: 浏览浏览器存储中的游戏资源文件</li>
                    <li><strong>系统文件</strong>: .mix、.bag、.ini 等核心游戏文件受保护，删除前会警告</li>
                    <li><strong>文件操作</strong>: 支持上传、删除、新建文件夹等操作</li>
                    <li><strong>调试工具</strong>: 此组件用于调试 mix 文件读取问题和资源管理</li>
                    <li><strong>ESM 迁移</strong>: 浏览器不再依赖 public 下的旧版 file-explorer.js</li>
                </ul>
            </div>
        </div>
    );
};

export default GameResourcesViewer;
