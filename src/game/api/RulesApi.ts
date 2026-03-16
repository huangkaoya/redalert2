export class RulesApi {
    private rules: any;
    constructor(rules: any) {
        this.rules = rules;
    }
    get allObjectRules() {
        return this.rules.allObjectRules;
    }
    get buildingRules() {
        return this.rules.buildingRules;
    }
    get infantryRules() {
        return this.rules.infantryRules;
    }
    get vehicleRules() {
        return this.rules.vehicleRules;
    }
    get aircraftRules() {
        return this.rules.aircraftRules;
    }
    get terrainRules() {
        return this.rules.terrainRules;
    }
    get overlayRules() {
        return this.rules.overlayRules;
    }
    get countryRules() {
        return this.rules.countryRules;
    }
    get general() {
        return this.rules.general;
    }
    get ai() {
        return this.rules.ai;
    }
    get crateRules() {
        return this.rules.crateRules;
    }
    get combatDamage() {
        return this.rules.combatDamage;
    }
    get radiation() {
        return this.rules.radiation;
    }
    hasObject(type: string, id: string): boolean {
        return this.rules.hasObject(type, id);
    }
    getObject(type: string, id: string): any {
        return this.rules.getObject(type, id);
    }
    getBuilding(id: string): any {
        return this.rules.getBuilding(id);
    }
    getWeapon(id: string): any {
        return this.rules.getWeapon(id);
    }
    getWarhead(id: string): any {
        return this.rules.getWarhead(id);
    }
    getProjectile(id: string): any {
        return this.rules.getProjectile(id);
    }
    getOverlayName(id: string): string {
        return this.rules.getOverlayName(id);
    }
    getOverlayId(name: string): string {
        return this.rules.getOverlayId(name);
    }
    getOverlay(id: string): any {
        return this.rules.getOverlay(id);
    }
    getCountry(id: string): any {
        return this.rules.getCountry(id);
    }
    getMultiplayerCountries(): any[] {
        return this.rules.getMultiplayerCountries();
    }
    getIni(): any {
        return this.rules.getIni();
    }
}
