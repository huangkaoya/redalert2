import { pad } from './string';
export function formatTimeDuration(seconds: number, showHours: boolean = false): string {
    const hours = Math.floor(seconds / 3600);
    seconds -= 3600 * hours;
    const minutes = Math.floor(seconds / 60);
    seconds -= 60 * minutes;
    return [...(hours || !showHours ? [hours] : []), pad(minutes, "00"), pad(seconds, "00")].join(":");
}
