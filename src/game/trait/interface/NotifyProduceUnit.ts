export const NotifyProduceUnit = {
    onProduce: Symbol()
};
export interface NotifyProduceUnit {
    [key: symbol]: (...args: any[]) => void;
}
