import { OverlayTibType } from '@/engine/type/OverlayTibType';
export class OreOverlayTypes {
    static minIdRiparius = 102;
    static maxIdRiparius = 127;
    static minIdCruentus = 27;
    static maxIdCruentus = 38;
    static minIdVinifera = 127;
    static maxIdVinifera = 146;
    static minIdAboreus = 147;
    static maxIdAboreus = 166;
    static getOverlayTibType(id: number): OverlayTibType {
        return this.isRiparius(id)
            ? OverlayTibType.Riparius
            : this.isCruentus(id)
                ? OverlayTibType.Cruentus
                : this.isVinifera(id)
                    ? OverlayTibType.Vinifera
                    : this.isAboreus(id)
                        ? OverlayTibType.Aboreus
                        : OverlayTibType.NotSpecial;
    }
    static isRiparius(id: number): boolean {
        return id >= this.minIdRiparius && id <= this.maxIdRiparius;
    }
    static isCruentus(id: number): boolean {
        return id >= this.minIdCruentus && id <= this.maxIdCruentus;
    }
    static isVinifera(id: number): boolean {
        return id >= this.minIdVinifera && id <= this.maxIdVinifera;
    }
    static isAboreus(id: number): boolean {
        return id >= this.minIdAboreus && id <= this.maxIdAboreus;
    }
}
