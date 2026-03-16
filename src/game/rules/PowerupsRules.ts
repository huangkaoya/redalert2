import { UNSUPPORTED_POWERUP_TYPES } from '../trait/CrateGeneratorTrait';
import { PowerupType } from '../type/PowerupType';
interface PowerupEntry {
    type: PowerupType;
    probShares: number;
    animName?: string;
    waterAllowed: boolean;
    data?: string;
}
export class PowerupsRules {
    private powerups: PowerupEntry[] = [];
    readIni(entries: Map<string, string>): this {
        for (const [key, value] of entries) {
            const [probShares, animName, waterAllowed, data] = value.split(',');
            const shares = Number(probShares);
            const type = PowerupType[key as keyof typeof PowerupType];
            if (type !== undefined) {
                if (!UNSUPPORTED_POWERUP_TYPES.includes(type)) {
                    this.powerups.push({
                        type,
                        probShares: shares,
                        animName: animName.toLowerCase() !== '<none>' ? animName : undefined,
                        waterAllowed: waterAllowed === 'yes',
                        data
                    });
                }
            }
            else {
                console.warn(`Unknown powerup "${key}". Skipping.`);
            }
        }
        return this;
    }
}
