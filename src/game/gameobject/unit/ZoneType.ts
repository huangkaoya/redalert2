import { LandType } from '@/game/type/LandType';
export enum ZoneType {
    Ground = 0,
    Air = 1,
    Water = 2
}
export const getZoneType = (landType: LandType): ZoneType => {
    return [LandType.Water, LandType.Beach].includes(landType)
        ? ZoneType.Water
        : ZoneType.Ground;
};
