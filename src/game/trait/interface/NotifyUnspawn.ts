export const NotifyUnspawn = {
  onUnspawn: Symbol()
};

export interface NotifyUnspawn {
  [key: symbol]: (...args: any[]) => void;
}
