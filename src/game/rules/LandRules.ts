import { SpeedType } from "@/game/type/SpeedType";
export class LandRules {
    private speedModifiers: Map<SpeedType, number>;
    private buildable: boolean;
    constructor() {
        this.speedModifiers = new Map();
    }
    readIni(ini: any): this {
        this.buildable = ini.getBool("Buildable", false);
        [...ini.entries.keys()].forEach((key) => {
            if (SpeedType[key] !== undefined) {
                this.speedModifiers.set(SpeedType[key as keyof typeof SpeedType], ini.getNumber(key));
            }
        });
        return this;
    }
    getSpeedModifier(speedType: SpeedType): number {
        if (speedType === SpeedType.Foot &&
            this.speedModifiers.get(SpeedType.Track) === 0) {
            return 0;
        }
        let modifier = this.speedModifiers.get(speedType);
        if (modifier === undefined) {
            modifier = 1;
        }
        if (speedType !== SpeedType.Track &&
            speedType !== SpeedType.Wheel &&
            modifier > 0) {
            modifier = 1;
        }
        return modifier;
    }
}
