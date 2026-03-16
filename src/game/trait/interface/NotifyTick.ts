export const NotifyTick = {
  onTick: Symbol()
};

export interface NotifyTick {
  [key: symbol]: (...args: any[]) => void;
}
