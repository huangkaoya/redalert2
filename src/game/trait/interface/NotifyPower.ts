export const NotifyPower = {
    onPowerLow: Symbol(),
    onPowerRestore: Symbol(),
    onPowerChange: Symbol()
};
export interface NotifyPower {
    [key: symbol]: (...args: any[]) => void;
}
