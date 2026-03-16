export interface NotifyWarpChange {
    [key: symbol]: (...args: any[]) => void;
}
export const NotifyWarpChange = {
    onChange: Symbol()
};
