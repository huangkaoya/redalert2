export const NotifySell = {
    onSell: Symbol()
};
export interface NotifySell {
    [key: symbol]: (...args: any[]) => void;
}
