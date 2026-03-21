import {
    getOriginPrivateDirectory,
    polyfillDataTransferItem,
    showDirectoryPicker,
    showOpenFilePicker,
    showSaveFilePicker,
    support,
} from 'file-system-access';
import cache from 'file-system-access/lib/adapters/cache.js';
import indexeddb from 'file-system-access/lib/adapters/indexeddb.js';
import type { FileSystemAccessLib } from './FileSystemAccessLib';

export const browserFileSystemAccess: FileSystemAccessLib = {
    support,
    adapters: {
        indexeddb,
        cache,
    },
    getOriginPrivateDirectory,
    async polyfillDataTransferItem() {
        await polyfillDataTransferItem();
    },
    showDirectoryPicker,
    showOpenFilePicker,
    showSaveFilePicker,
};
