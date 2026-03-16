export const NotifyObjectTraitAdd = {
    onAdd: Symbol()
};
export interface NotifyObjectTraitAdd {
    [key: symbol]: (...args: any[]) => void;
}
