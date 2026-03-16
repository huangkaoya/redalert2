export const NotifySpawn = {
  onSpawn: Symbol()
};

export interface NotifySpawn {
  [key: symbol]: (...args: any[]) => void;
}
