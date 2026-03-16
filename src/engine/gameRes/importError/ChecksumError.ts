export class ChecksumError extends Error {
    public fileName?: string;
    public expectedChecksum?: string | string[];
    public actualChecksum?: string;
    constructor(message: string, fileName?: string, expectedChecksum?: string | string[], actualChecksum?: string) {
        super(message);
        this.name = "ChecksumError";
        this.fileName = fileName;
        this.expectedChecksum = expectedChecksum;
        this.actualChecksum = actualChecksum;
    }
}
