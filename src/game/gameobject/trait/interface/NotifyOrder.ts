export const NotifyOrder = {
    onPush: Symbol()
};
export interface NotifyOrder {
    [key: symbol]: (...args: any[]) => void;
}
