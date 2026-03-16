export const NotifyCrash = {
    onCrash: Symbol()
};
export interface NotifyCrash {
    [key: symbol]: (...args: any[]) => void;
}
