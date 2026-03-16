export enum LadderType {
    Solo1v1 = "1v1",
    Random2v2 = "2v2-random"
}
export enum LadderQueueType {
    Solo1v1 = "1v1",
    Team2v2 = "2v2"
}
export const CURRENT_SEASON = "current";
export const PREV_SEASON = "prev";
export const MAX_LIST_SEARCH_COUNT = 50;
export const teamSizes = new Map([
    [LadderQueueType.Solo1v1, 1],
    [LadderQueueType.Team2v2, 2]
]);
export function getLadderTypeForQueueType(queueType: LadderQueueType): LadderType {
    switch (queueType) {
        case LadderQueueType.Solo1v1:
            return LadderType.Solo1v1;
        case LadderQueueType.Team2v2:
            return LadderType.Random2v2;
        default:
            throw new Error(`Unhandled queue type "${queueType}"`);
    }
}
