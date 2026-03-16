export const NotifyDestroy = {
    onDestroy: Symbol()
};
export interface NotifyDestroy {
    [key: symbol]: (...args: any[]) => void;
}
