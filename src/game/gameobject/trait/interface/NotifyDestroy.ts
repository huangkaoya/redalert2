export const NotifyDestroy = {
    onDestroy: Symbol('onDestroy')
};
export interface NotifyDestroy {
    [key: symbol]: (...args: any[]) => void;
}
