export const NotifyAllianceChange = {
    onChange: Symbol()
};
export interface NotifyAllianceChange {
    [key: symbol]: (...args: any[]) => void;
}
