export const NotifyDamage = {
    onDamage: Symbol()
};
export interface NotifyDamage {
    [key: symbol]: (...args: any[]) => void;
}
