import { formatTimeDuration } from '@/util/format';
import { AppLogger } from '@/util/logger';
export class LoggerApi {
    private logger: typeof AppLogger;
    private gameTime: {
        getCurrentTime(): number;
    };
    constructor(logger: typeof AppLogger, gameTime: {
        getCurrentTime(): number;
    }) {
        this.logger = logger;
        this.gameTime = gameTime;
    }
    setDebugLevel(debug: boolean): void {
        this.logger.setLevel(debug ? AppLogger.DEBUG : AppLogger.WARN);
    }
    debug(...args: any[]): void {
        this.logger.debug(this.getTimePrefix(), ...args);
    }
    info(...args: any[]): void {
        this.logger.info(this.getTimePrefix(), ...args);
    }
    log(...args: any[]): void {
        this.logger.log(this.getTimePrefix(), ...args);
    }
    warn(...args: any[]): void {
        this.logger.warn(this.getTimePrefix(), ...args);
    }
    error(...args: any[]): void {
        this.logger.error(this.getTimePrefix(), ...args);
    }
    time(label: string): void {
        this.logger.time(label);
    }
    timeEnd(label: string): void {
        this.logger.timeEnd(label);
    }
    private getTimePrefix(): string {
        return `[${formatTimeDuration(Math.floor(this.gameTime.getCurrentTime()))}]`;
    }
}
