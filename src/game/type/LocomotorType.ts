import { SpeedType } from './SpeedType';
export enum LocomotorType {
    Statue = 0,
    Aircraft = 1,
    Chrono = 2,
    Hover = 3,
    Infantry = 4,
    Jumpjet = 5,
    Missile = 6,
    Ship = 7,
    Vehicle = 8
}
export const locomotorTypesByClsId = new Map<string, LocomotorType>([
    ['{4A582746-9839-11d1-B709-00A024DDAFD1}', LocomotorType.Aircraft],
    ['{4A582747-9839-11d1-B709-00A024DDAFD1}', LocomotorType.Chrono],
    ['{4A582742-9839-11d1-B709-00A024DDAFD1}', LocomotorType.Hover],
    ['{4A582744-9839-11d1-B709-00A024DDAFD1}', LocomotorType.Infantry],
    ['{92612C46-F71F-11d1-AC9F-006008055BB5}', LocomotorType.Jumpjet],
    ['{B7B49766-E576-11d3-9BD9-00104B972FE8}', LocomotorType.Missile],
    ['{2BEA74E1-7CCA-11d3-BE14-00104B62A16C}', LocomotorType.Ship],
    ['{4A582741-9839-11d1-B709-00A024DDAFD1}', LocomotorType.Vehicle]
]);
export const defaultSpeedsByLocomotor = new Map<LocomotorType, SpeedType>([
    [LocomotorType.Infantry, SpeedType.Foot],
    [LocomotorType.Ship, SpeedType.Float],
    [LocomotorType.Hover, SpeedType.Hover],
    [LocomotorType.Jumpjet, SpeedType.Winged],
    [LocomotorType.Aircraft, SpeedType.Winged],
    [LocomotorType.Missile, SpeedType.Winged]
]);
(LocomotorType as any).locomotorTypesByClsId = locomotorTypesByClsId;
(LocomotorType as any).defaultSpeedsByLocomotor = defaultSpeedsByLocomotor;
