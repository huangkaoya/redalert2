export const NotifyHealthChange = {
    onChange: Symbol()
};
export interface NotifyHealthChange {
    [key: symbol]: (...args: any[]) => void;
}
