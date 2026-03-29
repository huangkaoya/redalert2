export interface LanRecentPlayRecord {
    gameId: string;
    roomId: string;
    role: 'host' | 'guest';
    modeLabel: string;
    mapTitle: string;
    mapOfficial: boolean;
    memberNames: string[];
    memberCount: number;
    timestamp: number;
}
