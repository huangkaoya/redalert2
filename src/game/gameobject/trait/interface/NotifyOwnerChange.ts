export const NotifyOwnerChange = {
    onChange: Symbol('onChange')
};
export interface NotifyOwnerChange {
    [key: symbol]: (...args: any[]) => void;
}
