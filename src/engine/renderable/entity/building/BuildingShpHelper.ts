import { AnimProps } from "@/engine/AnimProps";
import { ImageFinder, MissingImageError } from "@/engine/ImageFinder";
import { ShpAggregator } from "@/engine/renderable/builder/ShpAggregator";
export class BuildingShpHelper {
    constructor(private imageFinder: ImageFinder) { }
    getShpFrameInfos(building: {
        hasShadow: boolean;
    }, mainShp: string | undefined, turretShp: string | undefined, animShps: Map<{
        art: any;
    }, string>): Map<string, any> {
        const frameInfos = new Map<string, any>();
        if (mainShp) {
            frameInfos.set(mainShp, ShpAggregator.getShpFrameInfo(mainShp as any, building.hasShadow));
        }
        if (turretShp) {
            frameInfos.set(turretShp, ShpAggregator.getShpFrameInfo(turretShp as any, building.hasShadow));
        }
        for (const [anim, shpName] of animShps) {
            const animProps = new AnimProps(anim.art, shpName as any);
            const frameInfo = ShpAggregator.getShpFrameInfo(shpName as any, animProps.shadow);
            frameInfos.set(shpName, frameInfo);
        }
        return frameInfos;
    }
    collectAnimShpFiles(anims: {
        getAll(): Map<string, Array<{
            image: string;
        }>>;
    }, options: {
        useTheaterExtension: boolean;
    }): Map<{
        image: string;
    }, any> {
        const shpFiles = new Map<{
            image: string;
        }, any>();
        anims.getAll().forEach((animList) => {
            for (const anim of animList) {
                let shpFile;
                try {
                    shpFile = this.imageFinder.find(anim.image, options.useTheaterExtension);
                }
                catch (error) {
                    if (error instanceof MissingImageError) {
                        console.warn(error.message);
                        continue;
                    }
                    throw error;
                }
                shpFiles.set(anim, shpFile);
            }
        });
        return shpFiles;
    }
}
