export class SuperWeaponsTrait {
    private superWeapons: Map<string, any>;
    constructor() {
        this.superWeapons = new Map();
    }
    getAll(): any[] {
        return [...this.superWeapons.values()];
    }
    add(superWeapon: any): void {
        this.superWeapons.set(superWeapon.name, superWeapon);
    }
    has(name: string): boolean {
        return this.superWeapons.has(name);
    }
    get(name: string): any | undefined {
        return this.superWeapons.get(name);
    }
    remove(name: string): void {
        this.superWeapons.delete(name);
    }
}
