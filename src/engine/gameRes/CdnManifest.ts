export interface CdnManifest {
    version: number;
    format: string;
    checksums?: Record<string, number | string>;
    [key: string]: any;
}
