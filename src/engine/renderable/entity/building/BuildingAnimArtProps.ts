import { AnimationType } from "./AnimationType";
import { IniSection } from "@/data/IniSection";
import { BuildingAnimData } from "./BuildingAnimData";
import { ObjectType } from "@/engine/type/ObjectType";
const ANIM_PROP_NAMES = new Map<AnimationType, string[]>([
    [AnimationType.IDLE, ["IdleAnim"]],
    [AnimationType.PRODUCTION, ["ProductionAnim"]],
    [AnimationType.SUPER, [
            "SuperAnim",
            "SuperAnimTwo",
            "SuperAnimThree",
            "SuperAnimFour"
        ]],
    [AnimationType.ACTIVE, [
            "ActiveAnim",
            "ActiveAnimTwo",
            "ActiveAnimThree",
            "ActiveAnimFour"
        ]],
    [AnimationType.SPECIAL, [
            "SpecialAnim",
            "SpecialAnimTwo",
            "SpecialAnimThree",
            "SpecialAnimFour"
        ]],
    [AnimationType.FACTORY_DEPLOYING, [
            "DeployingAnim",
            "UnderDoorAnim"
        ]],
    [AnimationType.FACTORY_ROOF_DEPLOYING, [
            "RoofDeployingAnim",
            "UnderRoofDoorAnim"
        ]],
    [AnimationType.BUILDUP, ["Buildup"]],
    [AnimationType.UNBUILD, ["Buildup"]]
]);
export class BuildingAnimArtProps {
    private animsByType: Map<AnimationType, BuildingAnimData[]>;
    constructor() {
        this.animsByType = new Map();
    }
    read(config: IniSection, objectManager: any): void {
        ANIM_PROP_NAMES.forEach((propNames, type) => {
            const anims: BuildingAnimData[] = [];
            propNames.forEach((propName) => {
                const animName = config.getString(propName);
                if (animName) {
                    const animData = new BuildingAnimData();
                    animData.name = animName;
                    animData.type = type;
                    let art: IniSection | undefined;
                    let animObject: any;
                    if (objectManager.hasObject(animName, ObjectType.Animation)) {
                        animObject = objectManager.getObject(animName, ObjectType.Animation);
                        art = animObject.art;
                    }
                    if (type === AnimationType.BUILDUP || type === AnimationType.UNBUILD) {
                        art = art ? art.clone() : new IniSection(animName);
                        if (!art.has("Shadow")) {
                            art.set("Shadow", "yes");
                        }
                        if (type === AnimationType.UNBUILD) {
                            art.set("Reverse", "yes");
                        }
                    }
                    else if (!art) {
                        console.warn(`[BuildingAnimArtProps] Missing building anim section "${animName}", skipping.`);
                        return;
                    }
                    animData.art = art;
                    animData.pauseWhenUnpowered = config.getBool(propName + "Powered", true);
                    animData.showWhenUnpowered = !config.getBool(propName + "PoweredLight", false);
                    const damagedAnimName = config.getString(propName + "Damaged");
                    if (damagedAnimName && objectManager.hasObject(damagedAnimName, ObjectType.Animation)) {
                        animData.damagedArt = objectManager.getObject(damagedAnimName, ObjectType.Animation).art;
                    }
                    animData.offset = {
                        x: config.getNumber(propName + "X"),
                        y: config.getNumber(propName + "Y")
                    };
                    let image = art.getString("Image");
                    image = image || animName;
                    animData.image = image;
                    animData.flat = propName === "UnderDoorAnim" ||
                        propName === "UnderRoofDoorAnim" ||
                        art.getBool("Flat");
                    if (animObject) {
                        animData.translucent = animObject.translucent;
                        animData.translucency = animObject.translucency;
                    }
                    anims.push(animData);
                }
            });
            this.animsByType.set(type, anims);
        });
    }
    getByType(type: AnimationType): BuildingAnimData[] {
        if (!this.animsByType.has(type)) {
            throw new Error(`Animation type "${AnimationType[type]}" has no data`);
        }
        return this.animsByType.get(type)!;
    }
    getAll(): Map<AnimationType, BuildingAnimData[]> {
        return this.animsByType;
    }
}
