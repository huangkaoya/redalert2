import { OriginalDataStream } from "./OriginalDataStream.js";
import { OriginalBlowfish } from "./OriginalBlowfish.js";
import { BlowfishKey } from "./originalblowfishkey.js";
import { OriginalMixEntry } from "./OriginalMixEntry.js";
import { VirtualFile } from "../data/vfs/VirtualFile.ts";
const r = {
    Checksum: 65536,
    Encrypted: 131072
};
export class OriginalMixFile {
    constructor(e) {
        this.stream = e;
        this.headerStart = 84;
        this.index = new Map();
        this.parseHeader();
    }
    parseHeader() {
        var e = this.stream.readUint32(), t = 0 == (e & ~(r.Checksum | r.Encrypted));
        console.log(`parseHeader: 第一个uint32=0x${e.toString(16)}, t=${t}`);
        if (t) {
            if (0 != (e & r.Encrypted)) {
                console.log('检测到加密，调用parseRaHeader');
                return void (this.dataStart = this.parseRaHeader());
            }
        }
        else {
            console.log('不是标准头，重置到位置0');
            this.stream.seek(0);
        }
        console.log('调用parseTdHeader');
        this.dataStart = this.parseTdHeader(this.stream);
    }
    parseRaHeader() {
        console.log('parseRaHeader开始');
        const e = this.stream;
        var t = e.readUint8Array(80), i = new BlowfishKey().decryptKey(t), r = e.readUint32Array(2);
        console.log(`读取了80字节密钥和2个uint32: [${r[0]}, ${r[1]}]`);
        const s = new OriginalBlowfish(i);
        console.log('创建了Blowfish实例');
        let decrypted = s.decrypt(r);
        console.log(`解密结果类型: ${decrypted.constructor.name}, 长度: ${decrypted.length}`);
        console.log(`解密数据: [${decrypted[0]}, ${decrypted[1]}]`);
        let a = new OriginalDataStream(decrypted);
        console.log(`创建DataStream, byteLength=${a.byteLength}, position=${a.position}`);
        t = a.readUint16();
        console.log(`读取条目数: ${t}`);
        a.readUint32(), (e.position = this.headerStart);
        (i = 6 + t * OriginalMixEntry.size),
            (t = ((3 + i) / 4) | 0),
            (r = e.readUint32Array(t + (t % 2)));
        console.log(`需要读取${t + (t % 2)}个uint32用于头部解密`);
        let decrypted2 = s.decrypt(r);
        console.log(`第二次解密结果长度: ${decrypted2.length}`);
        a = new OriginalDataStream(decrypted2);
        console.log(`第二个DataStream, byteLength=${a.byteLength}`);
        i = this.headerStart + i + ((1 + (~i >>> 0)) & 7);
        console.log(`计算的dataStart: ${i}`);
        return this.parseTdHeader(a), i;
    }
    parseTdHeader(e) {
        console.log('parseTdHeader开始');
        console.log(`DataStream状态: position=${e.position}, byteLength=${e.byteLength}, isEof=${e.isEof()}`);
        var t = e.readUint16();
        console.log(`条目数: ${t}`);
        console.log(`读取条目数后: position=${e.position}, byteLength=${e.byteLength}`);
        e.readUint32();
        console.log(`读取uint32后: position=${e.position}, byteLength=${e.byteLength}`);
        for (let r = 0; r < t; r++) {
            if (e.position + 12 > e.byteLength) {
                console.error(`条目${r}: 数据不足，position=${e.position}, 需要12字节，剩余${e.byteLength - e.position}字节`);
                break;
            }
            try {
                var hash = e.readUint32();
                var offset = e.readUint32();
                var length = e.readUint32();
                var i = new OriginalMixEntry(hash, offset, length);
                this.index.set(i.hash, i);
                if (r < 5) {
                    console.log(`条目${r}: hash=0x${i.hash.toString(16)}, offset=${i.offset}, length=${i.length}`);
                }
                if (r % 1000 === 0 && r > 0) {
                    console.log(`已处理${r}个条目，position=${e.position}, 剩余字节=${e.byteLength - e.position}`);
                }
            }
            catch (error) {
                console.error(`条目${r}读取失败:`, error);
                console.log(`失败时状态: position=${e.position}, byteLength=${e.byteLength}`);
                break;
            }
        }
        console.log(`parseTdHeader完成，解析了${this.index.size}个条目，最终position=${e.position}`);
        return e.position;
    }
    containsFile(e) {
        return this.index.has(OriginalMixEntry.hashFilename(e));
    }
    openFile(e) {
        var t = this.index.get(OriginalMixEntry.hashFilename(e));
        if (!t)
            throw new Error(`File "${e}" not found`);
        return VirtualFile.factory(this.stream, e, this.dataStart + t.offset, t.length);
    }
}
