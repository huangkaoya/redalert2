export const NotifyPlaceBuilding = {
  onPlace: Symbol()
};

export interface NotifyPlaceBuilding {
  [key: symbol]: (...args: any[]) => void;
}
