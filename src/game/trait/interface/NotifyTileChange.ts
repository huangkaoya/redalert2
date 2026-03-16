export const NotifyTileChange = {
  onTileChange: Symbol()
};

export interface NotifyTileChange {
  [key: symbol]: (...args: any[]) => void;
}
