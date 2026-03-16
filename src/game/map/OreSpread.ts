import { OreOverlayTypes } from './OreOverlayTypes';
import { OverlayTibType } from '@/engine/type/OverlayTibType';
interface Tile {
    dx: number;
    dy: number;
}
export class OreSpread {
    static calculateOverlayId(type: OverlayTibType, tile: Tile): number | undefined {
        if (type !== OverlayTibType.NotSpecial) {
            let x = tile.dx;
            const y = tile.dy;
            x = Math.floor((((((y - 9) / 2) % 12) * (((y - 8) / 2) % 12)) % 12) -
                (((((x - 13) / 2) % 12) * (((x - 12) / 2) % 12)) % 12) +
                120000);
            x %= 12;
            switch (type) {
                case OverlayTibType.Ore:
                    return OreOverlayTypes.minIdRiparius + x;
                case OverlayTibType.Gems:
                    return OreOverlayTypes.minIdCruentus + x;
                case OverlayTibType.Vinifera:
                    return OreOverlayTypes.minIdVinifera + x;
                case OverlayTibType.Aboreus:
                    return OreOverlayTypes.minIdAboreus + x;
                default:
                    return undefined;
            }
        }
    }
}
