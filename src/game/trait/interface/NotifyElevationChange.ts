export const NotifyElevationChange = {
  onElevationChange: Symbol()
};

export interface NotifyElevationChange {
  [key: symbol]: (...args: any[]) => void;
}
