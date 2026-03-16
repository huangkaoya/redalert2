import { ModStatus } from "@/gui/screen/mainMenu/modSel/ModStatus";
interface ModMeta {
    id: string;
    name: string;
    supported: boolean;
    version?: string;
    download?: string;
    downloadSize?: number;
    manualDownload?: boolean;
    clone(): ModMeta;
}
export class Mod {
    public status: ModStatus;
    public meta: ModMeta;
    public latestVersion?: string;
    get id(): string {
        return this.meta.id;
    }
    get name(): string {
        return this.meta.name;
    }
    get supported(): boolean {
        return this.meta.supported;
    }
    constructor(localMeta?: ModMeta, remoteMeta?: ModMeta) {
        if (localMeta) {
            if (remoteMeta && remoteMeta.version !== localMeta.version) {
                this.status = ModStatus.UpdateAvailable;
                this.meta = localMeta.clone();
                this.meta.download = remoteMeta.download;
                this.meta.downloadSize = remoteMeta.downloadSize;
                this.meta.manualDownload = remoteMeta.manualDownload;
                this.latestVersion = remoteMeta.version;
            }
            else {
                this.status = ModStatus.Installed;
                this.meta = localMeta;
                this.latestVersion = localMeta.version;
            }
        }
        else {
            this.status = ModStatus.NotInstalled;
            if (!remoteMeta) {
                throw new Error("At least a local or remote meta must be specified");
            }
            this.meta = remoteMeta;
            this.latestVersion = remoteMeta.version;
        }
    }
    isInstalled(): boolean {
        return this.status !== ModStatus.NotInstalled;
    }
}
