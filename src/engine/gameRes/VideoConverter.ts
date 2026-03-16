import type { VirtualFile } from '../../data/vfs/VirtualFile';
import type { DataStream } from '../../data/DataStream';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
export class VideoConverter {
    async convertBinkVideo(ffmpeg: FFmpeg, binkFile: VirtualFile, outputFormat: "webm" | "mp4" = "webm"): Promise<Uint8Array> {
        const inputFileName = binkFile.filename;
        const outputFileName = inputFileName.replace(/\.[^.]+$/, "") + "." + outputFormat;
        const binkDataStream = binkFile.stream as DataStream;
        const binkFileData = new Uint8Array(binkDataStream.buffer, binkDataStream.byteOffset, binkDataStream.byteLength);
        await ffmpeg.writeFile(inputFileName, binkFileData);
        if (outputFormat === "webm") {
            await ffmpeg.exec([
                "-i", inputFileName,
                "-vcodec", "libvpx",
                "-crf", "10",
                "-b:v", "2M",
                "-an",
                outputFileName,
            ]);
        }
        else if (outputFormat === "mp4") {
            await ffmpeg.exec([
                "-i", inputFileName,
                "-vcodec", "libx264",
                "-crf", "25",
                "-b:v", "2M",
                "-an",
                outputFileName,
            ]);
        }
        else {
            await ffmpeg.deleteFile(inputFileName);
            throw new Error(`Unsupported video output format: ${outputFormat}`);
        }
        const convertedData = await ffmpeg.readFile(outputFileName) as Uint8Array;
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        return convertedData;
    }
}
