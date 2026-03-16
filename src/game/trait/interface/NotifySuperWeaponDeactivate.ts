export const NotifySuperWeaponDeactivate = {
    onDeactivate: Symbol()
};
export interface NotifySuperWeaponDeactivate {
    [key: symbol]: (...args: any[]) => void;
}
