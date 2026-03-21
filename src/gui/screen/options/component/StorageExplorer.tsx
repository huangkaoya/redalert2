import React from 'react';
import { Strings } from '../../../../data/Strings';
import { Engine } from '../../../../engine/Engine';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
import { StorageFileExplorer } from '../../../component/fileExplorer/StorageFileExplorer';

interface StorageExplorerProps {
    strings: Strings;
    messageBoxApi: MessageBoxApi;
    storageDirHandle: FileSystemDirectoryHandle;
    startIn?: string;
    onFileSystemChange?: () => void;
}

const StorageExplorer: React.FC<StorageExplorerProps> = ({ strings, messageBoxApi, storageDirHandle, startIn, onFileSystemChange }) => {
    const modIdRegex = /^[a-z0-9-_]+$/i;
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
        return allowedPatterns.some(pattern => typeof pattern === 'string'
            ? path.toLowerCase() === pattern.toLowerCase()
            : pattern.test(path));
    };

    const shouldLowerCaseFile = (path: string): boolean => {
        const lowerCasePatterns: (string | RegExp)[] = [
            '/keyboard.ini',
            /^\/[^\/]+\.mix$/i,
            /^\/music\/.*$/i,
            /^\/taunts\/.*$/i,
        ];
        return lowerCasePatterns.some(pattern => typeof pattern === 'string'
            ? path.toLowerCase() === pattern.toLowerCase()
            : pattern.test(path));
    };

    return (
        <div className="storage-explorer" style={{ height: '100%' }}>
            <StorageFileExplorer
                rootHandle={storageDirHandle}
                rootLabel="/"
                startIn={startIn}
                isSystemFile={isSystemFile}
                isUploadAllowed={isUploadAllowed}
                shouldLowerCaseFile={shouldLowerCaseFile}
                onFileSystemChange={onFileSystemChange}
                canCreateFolder={(path, segments) => {
                    const lastSegment = segments[segments.length - 1];
                    return path === `/${Engine.rfsSettings.modDir}` || lastSegment === Engine.rfsSettings.modDir;
                }}
                validateNewFolderName={(name) => {
                    if (!modIdRegex.test(name)) {
                        return '文件夹名称只允许字母、数字、- 和 _。';
                    }
                    return undefined;
                }}
                promptForText={async (promptText) => messageBoxApi.prompt(
                    promptText,
                    strings.get('GUI:Create') || 'Create',
                    strings.get('GUI:Cancel') || 'Cancel',
                )}
                confirmAction={async (message, confirmLabel, cancelLabel) => messageBoxApi.confirm(
                    message,
                    confirmLabel || strings.get('GUI:Ok') || 'OK',
                    cancelLabel || strings.get('GUI:Cancel') || 'Cancel',
                )}
                showAlert={async (message, title) => {
                    messageBoxApi.show(
                        title ? `${title}\n\n${message}` : message,
                        strings.get('GUI:Ok') || 'OK',
                    );
                }}
                loadingLabel={strings.get('GUI:LoadingFileExplorer') || 'Loading file explorer...'}
            />
        </div>
    );
};

export default StorageExplorer;
