export class GameSpeed {
    static BASE_TICKS_PER_SECOND = 15;
    static computeGameSpeed(speed: number): number {
        let ticksPerSecond: number;
        if (speed === 6) {
            ticksPerSecond = 60;
        }
        else if (speed === 5) {
            ticksPerSecond = 45;
        }
        else {
            ticksPerSecond = 60 / (6 - speed);
        }
        return ticksPerSecond / GameSpeed.BASE_TICKS_PER_SECOND;
    }
}
