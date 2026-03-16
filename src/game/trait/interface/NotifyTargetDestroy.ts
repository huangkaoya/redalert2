export const NotifyTargetDestroy = {
    onDestroy: Symbol()
};
export interface NotifyTargetDestroy {
    [key: symbol]: (...args: any[]) => void;
}
