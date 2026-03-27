// A periodically-refreshed cache of known threats to a bot so we can use it in decision making.

export class GlobalThreat {
    constructor(
        public certainty: number, // 0.0 - 1.0 based on approximate visibility around the map.
        public totalOffensiveLandThreat: number, // a number that approximates how much land-based firepower our opponents have.
        public totalOffensiveAirThreat: number, // a number that approximates how much airborne firepower our opponents have.
        public totalOffensiveAntiAirThreat: number, // a number that approximates how much anti-air firepower our opponents have.
        public totalDefensiveThreat: number, // a number that approximates how much defensive power our opponents have.
        public totalDefensivePower: number, // a number that approximates how much defensive power we have.
        public totalAvailableAntiGroundFirepower: number, // how much anti-ground power we have
        public totalAvailableAntiAirFirepower: number, // how much anti-air power we have
        public totalAvailableAirPower: number, // how much firepower we have in air units
    ) {}
}
