export const NotifyAttack = {
    onAttack: Symbol()
};
export interface NotifyAttack {
    [key: symbol]: (...args: any[]) => void;
}
