export class ZipUtils {
    static createByteArray(entries: {
        size?: number;
        data: Uint8Array | number | string | bigint;
    }[]): Uint8Array {
        const totalSize = entries.reduce((sum, entry) => sum + (entry.size || (entry.data as any).length), 0);
        const result = new Uint8Array(totalSize);
        const view = new DataView(result.buffer);
        let offset = 0;
        entries.forEach((entry) => {
            if (entry.data instanceof Uint8Array) {
                result.set(entry.data, offset);
                offset += entry.data.length;
            }
            else {
                switch (entry.size) {
                    case 1:
                        view.setInt8(offset, parseInt(entry.data.toString()));
                        break;
                    case 2:
                        view.setInt16(offset, parseInt(entry.data.toString()), true);
                        break;
                    case 4:
                        view.setInt32(offset, parseInt(entry.data.toString()), true);
                        break;
                    case 8:
                        view.setBigInt64(offset, BigInt(entry.data.toString()), true);
                        break;
                    default:
                        throw new Error(`createByteArray: No handler defined for data size ${entry.size} of entry data ${JSON.stringify(entry.data)}`);
                }
                offset += entry.size!;
            }
        });
        return result;
    }
    static getTimeStruct(date: Date): number {
        return (((date.getHours() << 6) | date.getMinutes()) << 5) | (date.getSeconds() / 2);
    }
    static getDateStruct(date: Date): number {
        return ((((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate();
    }
}
