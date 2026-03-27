import { BotSandbox } from './BotSandbox';
import { ThirdPartyBotMeta } from './ThirdPartyBotInterface';

/**
 * Handles bot zip file upload, extraction, validation, and registration.
 */
export class BotUploader {
    /**
     * Process an uploaded bot zip file.
     * Extracts, validates security, and registers the bot.
     * @returns The registered bot metadata, or null if failed.
     */
    static async processUpload(file: File): Promise<{
        success: boolean;
        meta?: ThirdPartyBotMeta;
        errors?: string[];
    }> {
        // Validate file type
        if (!file.name.endsWith('.zip')) {
            return { success: false, errors: ['Only .zip files are allowed.'] };
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return { success: false, errors: ['File too large (max 10MB).'] };
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const files = await this.extractZip(arrayBuffer);

            console.log(`[BotUploader] Extracted ${files.length} files:`, files.map(f => `${f.name} (${f.content.length}B)`));

            // Validate zip content
            const contentViolations = BotSandbox.validateZipContent(
                files.map(f => ({ name: f.name, size: f.content.length }))
            );
            if (contentViolations.length > 0) {
                return { success: false, errors: contentViolations };
            }

            // Find main entry point (bot.ts or index.ts)
            const mainFile = files.find(
                f => f.name === 'bot.ts' || f.name === 'index.ts'
            ) || files.find(
                f => f.name.endsWith('/bot.ts') || f.name.endsWith('/index.ts')
            );

            if (!mainFile) {
                return {
                    success: false,
                    errors: [`No bot.ts or index.ts found in zip root. Files in zip: [${files.map(f => f.name).join(', ')}]`],
                };
            }

            const rawSource = new TextDecoder().decode(mainFile.content);
            const source = BotSandbox.stripTypes(rawSource);

            // Validate source code
            const sourceViolations = BotSandbox.validateSource(source);
            if (sourceViolations.length > 0) {
                return { success: false, errors: sourceViolations };
            }

            // Load and register the bot
            const meta = BotSandbox.loadBotFromSource(source, file.name);
            if (!meta) {
                return {
                    success: false,
                    errors: ['Failed to load bot. Check that your bot exports the required interface.'],
                };
            }

            return { success: true, meta };
        } catch (e) {
            return {
                success: false,
                errors: [`Failed to process zip: ${(e as Error).message}`],
            };
        }
    }

    /**
     * Simple zip extraction using the browser's built-in capabilities.
     * Handles basic PK-format zip files.
     */
    private static async extractZip(
        buffer: ArrayBuffer,
    ): Promise<{ name: string; content: Uint8Array }[]> {
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        const files: { name: string; content: Uint8Array }[] = [];

        // ── 1. Locate End-of-Central-Directory record (EOCD) ──
        // Scan backwards from the end; EOCD signature = 0x06054b50.
        let eocdOffset = -1;
        for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65558; i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                eocdOffset = i;
                break;
            }
        }
        if (eocdOffset === -1) {
            throw new Error('Invalid zip: end-of-central-directory record not found');
        }

        const cdEntryCount = view.getUint16(eocdOffset + 10, true);
        const cdOffset = view.getUint32(eocdOffset + 16, true);

        // ── 2. Walk the central directory to collect file metadata ──
        interface CdEntry {
            fileName: string;
            compressionMethod: number;
            compressedSize: number;
            uncompressedSize: number;
            localHeaderOffset: number;
        }
        const entries: CdEntry[] = [];
        let pos = cdOffset;

        for (let i = 0; i < cdEntryCount; i++) {
            if (pos + 46 > bytes.length) break;
            const sig = view.getUint32(pos, true);
            if (sig !== 0x02014b50) break; // not a central directory entry

            const compressionMethod = view.getUint16(pos + 10, true);
            const compressedSize = view.getUint32(pos + 20, true);
            const uncompressedSize = view.getUint32(pos + 24, true);
            const fileNameLength = view.getUint16(pos + 28, true);
            const extraFieldLength = view.getUint16(pos + 30, true);
            const commentLength = view.getUint16(pos + 32, true);
            const localHeaderOffset = view.getUint32(pos + 42, true);

            const fileNameBytes = new Uint8Array(buffer, pos + 46, fileNameLength);
            const fileName = new TextDecoder().decode(fileNameBytes);

            entries.push({ fileName, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
            pos += 46 + fileNameLength + extraFieldLength + commentLength;
        }

        // ── 3. Extract each file using its local header + central-dir sizes ──
        for (const entry of entries) {
            // Skip directory entries
            if (entry.fileName.endsWith('/')) continue;

            const lh = entry.localHeaderOffset;
            if (lh + 30 > bytes.length) continue;

            const lhFileNameLength = view.getUint16(lh + 26, true);
            const lhExtraFieldLength = view.getUint16(lh + 28, true);
            const dataOffset = lh + 30 + lhFileNameLength + lhExtraFieldLength;

            if (entry.compressionMethod === 0) {
                // Stored (no compression)
                if (dataOffset + entry.uncompressedSize > bytes.length) continue;
                const content = new Uint8Array(buffer, dataOffset, entry.uncompressedSize);
                files.push({ name: entry.fileName, content: new Uint8Array(content) });
            } else if (entry.compressionMethod === 8) {
                // Deflate
                if (dataOffset + entry.compressedSize > bytes.length) continue;
                const compressedData = new Uint8Array(buffer, dataOffset, entry.compressedSize);
                try {
                    const decompressed = await this.inflateRaw(compressedData);
                    files.push({ name: entry.fileName, content: decompressed });
                } catch {
                    console.warn(`[BotUploader] Skipping file ${entry.fileName}: decompression failed`);
                }
            }
        }

        return files;
    }

    /**
     * Decompress raw deflate data using DecompressionStream API.
     */
    private static async inflateRaw(data: Uint8Array): Promise<Uint8Array> {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(data as unknown as BufferSource);
        writer.close();

        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        let totalLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            totalLength += value.length;
        }

        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }
}
