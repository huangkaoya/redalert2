export class AirportBoundTrait {
    private airportNames: string[];
    constructor(airportNames: string[]) {
        this.airportNames = airportNames;
    }
    findAvailableAirport(unit: {
        owner: {
            buildings: any[];
        };
    }) {
        return [...unit.owner.buildings].find((building) => building.dockTrait &&
            this.airportNames.includes(building.name) &&
            building.dockTrait.getAvailableDockCount() > 0);
    }
}
