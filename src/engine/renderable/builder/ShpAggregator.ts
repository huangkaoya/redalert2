import { ShpFile } from "@/data/ShpFile";
import { ShpImage } from "@/data/ShpImage";
export class ShpAggregator {
    static getShpFrameInfo(file: ShpFile, hasShadow: boolean) {
        return {
            file,
            hasShadow,
            frameCount: Math.floor(file.numImages * (hasShadow ? 0.5 : 1)),
        };
    }
    aggregate(frames: Array<{
        file: ShpFile;
        hasShadow: boolean;
        frameCount: number;
    }>, filename: string) {
        const shpFile = new ShpFile();
        shpFile.filename = filename;
        const shadowImages: ShpImage[] = [];
        const imageIndexes = new Map<ShpFile, number>();
        let currentIndex = 0;
        for (const { file, hasShadow, frameCount } of frames) {
            if (!imageIndexes.has(file)) {
                imageIndexes.set(file, currentIndex);
                for (let i = 0; i < frameCount; i++) {
                    shpFile.addImage(file.getImage(i));
                    shadowImages.push(hasShadow ? file.getImage(frameCount + i) : new ShpImage());
                    currentIndex++;
                }
            }
        }
        shadowImages.forEach(image => shpFile.addImage(image));
        return {
            file: shpFile,
            imageIndexes
        };
    }
}
