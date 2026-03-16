export const NotifyWarpChange = {
    onChange: Symbol()
};
export interface NotifyWarpChange {
    [key: symbol]: (...args: any[]) => void;
}
