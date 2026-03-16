export interface NotifyBuildStatus {
    [key: symbol]: (...args: any[]) => void;
}
export const NotifyBuildStatus = {
    onStatusChange: Symbol()
};
