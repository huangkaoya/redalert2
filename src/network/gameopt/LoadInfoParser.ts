export interface LoadInfo {
    name: string;
    status: number;
    loadPercent: number;
    ping: number;
    lagAllowanceMillis: number;
}
export class LoadInfoParser {
    parse(data: string): LoadInfo[] {
        const result: LoadInfo[] = [];
        const parts = data.split(',');
        for (let i = 0; i < parts.length / 5; ++i) {
            const playerInfo: LoadInfo = {
                name: parts[5 * i],
                status: Number(parts[5 * i + 1]),
                loadPercent: Number(parts[5 * i + 2]),
                ping: Number(parts[5 * i + 3]),
                lagAllowanceMillis: Number(parts[5 * i + 4])
            };
            result.push(playerInfo);
        }
        return result;
    }
}
