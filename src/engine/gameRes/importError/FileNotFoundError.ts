export class FileNotFoundError extends Error {
    public fileName?: string;
    constructor(messageOrFileName: string, fileName?: string) {
        if (fileName) {
            super(`Game resource file not found: ${fileName}. ${messageOrFileName}`);
            this.fileName = fileName;
        }
        else {
            super(messageOrFileName);
            this.fileName = messageOrFileName;
        }
        this.name = "GameResFileNotFoundError";
    }
}
