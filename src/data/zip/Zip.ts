import { Crc32 } from '../Crc32';
import { ZipUtils } from './ZipUtils';
interface FileRecord {
    name: string;
    sizeBig: bigint;
    crc: Crc32;
    done: boolean;
    date: Date;
    headerOffsetBig: bigint;
}
interface ByteArrayData {
    data: number | bigint | Uint8Array;
    size?: number;
}
export class Zip {
    private zip64: boolean;
    private fileRecord: FileRecord[];
    private finished: boolean;
    private byteCounterBig: bigint;
    private outputStream: ReadableStream<Uint8Array>;
    private outputController: ReadableStreamDefaultController<Uint8Array>;
    constructor(zip64: boolean = false) {
        this.zip64 = zip64;
        console.info("Started zip with zip64: " + this.zip64);
        this.fileRecord = [];
        this.finished = false;
        this.byteCounterBig = BigInt(0);
        this.outputStream = new ReadableStream<Uint8Array>({
            start: (controller) => {
                console.info("OutputStream has started!");
                this.outputController = controller;
            },
            cancel: () => {
                console.info("OutputStream has been canceled!");
            },
        });
    }
    private enqueue(data: Uint8Array): void {
        this.outputController.enqueue(data);
    }
    private close(): void {
        this.outputController.close();
    }
    private getZip64ExtraField(sizeBig: bigint, offsetBig: bigint): Uint8Array {
        return ZipUtils.createByteArray([
            { data: 1, size: 2 },
            { data: 28, size: 2 },
            { data: sizeBig, size: 8 },
            { data: sizeBig, size: 8 },
            { data: offsetBig, size: 8 },
            { data: 0, size: 4 },
        ]);
    }
    private isWritingFile(): boolean {
        return (0 < this.fileRecord.length &&
            false === this.fileRecord[this.fileRecord.length - 1].done);
    }
    public startFile(fileName: string, fileDate: Date): void {
        if (this.isWritingFile() || this.finished) {
            throw new Error("Tried adding file while adding other file or while zip has finished");
        }
        console.info("Start file: " + fileName);
        const date = new Date(fileDate);
        this.fileRecord = [
            ...this.fileRecord,
            {
                name: fileName,
                sizeBig: BigInt(0),
                crc: new Crc32(),
                done: false,
                date: date,
                headerOffsetBig: this.byteCounterBig,
            },
        ];
        const encodedFileName = new TextEncoder().encode(fileName);
        const headerData = ZipUtils.createByteArray([
            { data: 67324752, size: 4 },
            { data: 45, size: 2 },
            { data: 2056, size: 2 },
            { data: 0, size: 2 },
            { data: ZipUtils.getTimeStruct(date), size: 2 },
            { data: ZipUtils.getDateStruct(date), size: 2 },
            { data: 0, size: 4 },
            { data: this.zip64 ? 4294967295 : 0, size: 4 },
            { data: this.zip64 ? 4294967295 : 0, size: 4 },
            { data: encodedFileName.length, size: 2 },
            { data: this.zip64 ? 32 : 0, size: 2 },
            { data: encodedFileName },
            {
                data: this.zip64
                    ? this.getZip64ExtraField(BigInt(0), this.byteCounterBig)
                    : new Uint8Array(0),
            },
        ]);
        this.enqueue(headerData);
        this.byteCounterBig += BigInt(headerData.length);
    }
    public appendData(data: Uint8Array): void {
        if (!this.isWritingFile() || this.finished) {
            throw new Error("Tried to append file data, but there is no open file!");
        }
        this.enqueue(data);
        this.byteCounterBig += BigInt(data.length);
        this.fileRecord[this.fileRecord.length - 1].crc.append(data);
        this.fileRecord[this.fileRecord.length - 1].sizeBig += BigInt(data.length);
    }
    public endFile(): void {
        if (!this.isWritingFile() || this.finished) {
            throw new Error("Tried to end file, but there is no open file!");
        }
        const currentFile = this.fileRecord[this.fileRecord.length - 1];
        console.info("End file: " + currentFile.name);
        const dataDescriptor = ZipUtils.createByteArray([
            { data: currentFile.crc.get(), size: 4 },
            { data: currentFile.sizeBig, size: this.zip64 ? 8 : 4 },
            { data: currentFile.sizeBig, size: this.zip64 ? 8 : 4 },
        ]);
        this.enqueue(dataDescriptor);
        this.byteCounterBig += BigInt(dataDescriptor.length);
        this.fileRecord[this.fileRecord.length - 1].done = true;
    }
    public finish(): void {
        if (this.isWritingFile() || this.finished) {
            throw new Error("Empty zip, or there is still a file open");
        }
        console.info("Finishing zip");
        let centralDirectorySize = BigInt(0);
        const centralDirectoryOffset = this.byteCounterBig;
        this.fileRecord.forEach((fileRecord) => {
            const { date, crc, sizeBig, name, headerOffsetBig, } = fileRecord;
            const encodedFileName = new TextEncoder().encode(name);
            const centralDirectoryRecord = ZipUtils.createByteArray([
                { data: 33639248, size: 4 },
                { data: 45, size: 2 },
                { data: 45, size: 2 },
                { data: 2056, size: 2 },
                { data: 0, size: 2 },
                { data: ZipUtils.getTimeStruct(date), size: 2 },
                { data: ZipUtils.getDateStruct(date), size: 2 },
                { data: crc.get(), size: 4 },
                { data: this.zip64 ? 4294967295 : sizeBig, size: 4 },
                { data: this.zip64 ? 4294967295 : sizeBig, size: 4 },
                { data: encodedFileName.length, size: 2 },
                { data: this.zip64 ? 32 : 0, size: 2 },
                { data: 0, size: 2 },
                { data: 0, size: 2 },
                { data: 0, size: 2 },
                { data: 0, size: 4 },
                { data: this.zip64 ? 4294967295 : headerOffsetBig, size: 4 },
                { data: encodedFileName },
                {
                    data: this.zip64 ? this.getZip64ExtraField(sizeBig, headerOffsetBig) : new Uint8Array(0),
                },
            ]);
            this.enqueue(centralDirectoryRecord);
            this.byteCounterBig += BigInt(centralDirectoryRecord.length);
            centralDirectorySize += BigInt(centralDirectoryRecord.length);
        });
        if (this.zip64) {
            const zip64EndOfCentralDirectoryOffset = this.byteCounterBig;
            const zip64EndOfCentralDirectoryRecord = ZipUtils.createByteArray([
                { data: 101075792, size: 4 },
                { data: 44, size: 8 },
                { data: 45, size: 2 },
                { data: 45, size: 2 },
                { data: 0, size: 4 },
                { data: 0, size: 4 },
                { data: this.fileRecord.length, size: 8 },
                { data: this.fileRecord.length, size: 8 },
                { data: centralDirectorySize, size: 8 },
                { data: centralDirectoryOffset, size: 8 },
            ]);
            this.enqueue(zip64EndOfCentralDirectoryRecord);
            this.byteCounterBig += BigInt(zip64EndOfCentralDirectoryRecord.length);
            const zip64EndOfCentralDirectoryLocator = ZipUtils.createByteArray([
                { data: 117853008, size: 4 },
                { data: 0, size: 4 },
                { data: zip64EndOfCentralDirectoryOffset, size: 8 },
                { data: 1, size: 4 },
            ]);
            this.enqueue(zip64EndOfCentralDirectoryLocator);
            this.byteCounterBig += BigInt(zip64EndOfCentralDirectoryLocator.length);
        }
        const endOfCentralDirectoryRecord = ZipUtils.createByteArray([
            { data: 101010256, size: 4 },
            { data: 0, size: 2 },
            { data: 0, size: 2 },
            {
                data: this.zip64 ? 65535 : this.fileRecord.length,
                size: 2,
            },
            {
                data: this.zip64 ? 65535 : this.fileRecord.length,
                size: 2,
            },
            { data: this.zip64 ? 4294967295 : centralDirectorySize, size: 4 },
            { data: this.zip64 ? 4294967295 : centralDirectoryOffset, size: 4 },
            { data: 0, size: 2 },
        ]);
        this.enqueue(endOfCentralDirectoryRecord);
        this.close();
        this.byteCounterBig += BigInt(endOfCentralDirectoryRecord.length);
        this.finished = true;
        console.info("Done writing zip file. " +
            `Wrote ${this.fileRecord.length} files and a total of ${this.byteCounterBig} bytes.`);
    }
    public getOutputStream(): ReadableStream<Uint8Array> {
        return this.outputStream;
    }
}
