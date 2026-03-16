export const NotifyOwnerChange = {
  onChange: Symbol()
};

export interface NotifyOwnerChange {
  [key: symbol]: (...args: any[]) => void;
}
