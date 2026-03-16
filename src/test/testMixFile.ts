import { OriginalDataStream } from './OriginalDataStream.js';
import { OriginalMixFile } from './OriginalMixFile.js';
import { OriginalMixEntry } from './OriginalMixEntry.js';
export async function testMixFile() {
    console.log('开始测试MixFile解析...');
    try {
        const response = await fetch('/ra2.mix');
        if (!response.ok) {
            throw new Error(`Failed to load ra2.mix: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log(`ra2.mix文件大小: ${arrayBuffer.byteLength} bytes`);
        const stream = new OriginalDataStream(arrayBuffer);
        console.log('\n=== 文件头信息 ===');
        const originalPosition = stream.position;
        const firstUint32 = stream.readUint32();
        console.log(`第一个uint32: 0x${firstUint32.toString(16)} (${firstUint32})`);
        const isEncrypted = (firstUint32 & 131072) !== 0;
        const hasChecksum = (firstUint32 & 65536) !== 0;
        console.log(`是否加密: ${isEncrypted}`);
        console.log(`是否有校验和: ${hasChecksum}`);
        stream.seek(originalPosition);
        const mixFile = new OriginalMixFile(stream);
        console.log(`\n=== 解析结果 ===`);
        console.log(`解析完成，条目数量: ${mixFile.index.size}`);
        console.log(`数据开始位置: ${mixFile.dataStart}`);
        const hasLocalMix = mixFile.containsFile('local.mix');
        console.log(`包含local.mix: ${hasLocalMix}`);
        console.log('\n=== 前10个条目详情 ===');
        let count = 0;
        for (const [hash, entry] of mixFile.index) {
            if (count >= 10)
                break;
            console.log(`Hash: ${hash.toString(16).padStart(8, '0')}, Offset: ${entry.offset}, Length: ${entry.length}`);
            if (entry.offset > arrayBuffer.byteLength || entry.length > arrayBuffer.byteLength) {
                console.warn(`  ⚠️ 异常值: offset=${entry.offset}, length=${entry.length}, 文件大小=${arrayBuffer.byteLength}`);
            }
            count++;
        }
        console.log('\n=== 尝试查找已知文件的hash ===');
        const knownFiles = [
            'local.mix', 'cache.mix', 'conquer.mix', 'generic.mix',
            'isogen.mix', 'isosnow.mix', 'load.mix', 'key.ini',
            'glsl.png', 'ra2ts_l.webm', 'theme.mix', 'ra2.csf', 'rules.ini'
        ];
        for (const fileName of knownFiles) {
            const hash = OriginalMixEntry.hashFilename(fileName);
            const exists = mixFile.index.has(hash);
            console.log(`${fileName}: hash=0x${hash.toString(16).padStart(8, '0')}, 存在=${exists}`);
            if (exists) {
                const entry = mixFile.index.get(hash);
                console.log(`  -> Offset: ${entry.offset}, Length: ${entry.length}`);
            }
        }
        console.log('\n=== 尝试暴力破解文件名 ===');
        const extensions = ['.mix', '.csf', '.ini', '.png', '.wav', '.aud', '.voc', '.shp', '.tmp', '.pal', '.vxl', '.hva'];
        const commonNames = [
            'local', 'cache', 'conquer', 'generic', 'isogen', 'isosnow', 'load', 'key',
            'theme', 'rules', 'art', 'sound', 'glsl', 'ra2ts_l', 'cameo'
        ];
        let foundFiles = 0;
        for (const name of commonNames) {
            for (const ext of extensions) {
                const fileName = name + ext;
                const hash = OriginalMixEntry.hashFilename(fileName);
                if (mixFile.index.has(hash)) {
                    const entry = mixFile.index.get(hash);
                    console.log(`找到文件: ${fileName} (hash=0x${hash.toString(16).padStart(8, '0')}, offset=${entry.offset}, length=${entry.length})`);
                    foundFiles++;
                    if (foundFiles >= 20)
                        break;
                }
            }
            if (foundFiles >= 20)
                break;
        }
        if (foundFiles === 0) {
            console.log('没有找到任何已知文件名匹配的条目');
            console.log('\n=== 统计信息 ===');
            let validEntries = 0;
            let invalidEntries = 0;
            for (const [hash, entry] of mixFile.index) {
                if (entry.offset < arrayBuffer.byteLength && entry.length < arrayBuffer.byteLength) {
                    validEntries++;
                }
                else {
                    invalidEntries++;
                }
            }
            console.log(`有效条目: ${validEntries}`);
            console.log(`无效条目: ${invalidEntries}`);
        }
        return mixFile;
    }
    catch (error) {
        console.error('测试失败:', error);
        throw error;
    }
}
