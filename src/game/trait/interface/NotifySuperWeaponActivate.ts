export const NotifySuperWeaponActivate = {
  onActivate: Symbol()
};

export interface NotifySuperWeaponActivate {
  [key: symbol]: (...args: any[]) => void;
}
