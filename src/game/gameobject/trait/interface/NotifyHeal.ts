export const NotifyHeal = {
    onHeal: Symbol()
};
export interface NotifyHeal {
    [key: symbol]: (...args: any[]) => void;
}
