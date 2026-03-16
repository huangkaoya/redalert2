export const NotifyTeleport = {
    onBeforeTeleport: Symbol()
};
export interface NotifyTeleport {
    [key: symbol]: (...args: any[]) => void;
}
