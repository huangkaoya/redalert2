import {
    ActionsApi,
    GameApi,
    PlayerData,
    ProductionApi,
    QueueStatus,
    QueueType,
    TechnoRules,
} from "../../../game-api";
import { GlobalThreat } from "../threat/threat";
import { TechnoRulesWithPriority } from "./buildingRules";
import { SupabotContext } from "../common/context";
import { UnitRequest } from "../mission/missionController";

export const QUEUES = [
    QueueType.Structures,
    QueueType.Armory,
    QueueType.Infantry,
    QueueType.Vehicles,
    QueueType.Aircrafts,
    QueueType.Ships,
];

function isBuildingQueue(queueType: QueueType): boolean {
    return queueType === QueueType.Structures || queueType === QueueType.Armory;
}

export const queueTypeToName = (queue: QueueType) => {
    switch (queue) {
        case QueueType.Structures:
            return "Structures";
        case QueueType.Armory:
            return "Armory";
        case QueueType.Infantry:
            return "Infantry";
        case QueueType.Vehicles:
            return "Vehicles";
        case QueueType.Aircrafts:
            return "Aircrafts";
        case QueueType.Ships:
            return "Ships";
        default:
            return "Unknown";
    }
};

type QueueState = {
    queue: QueueType;
    /** sorted in ascending order (last item is the topItem) */
    items: TechnoRulesWithPriority[];
    topItem: TechnoRulesWithPriority | undefined;
};

const REPAIR_CHECK_INTERVAL = 30;

export class QueueController {
    private queueStates: QueueState[] = [];
    private lastRepairCheckAt = 0;

    constructor() {}

    public onAiUpdate(
        context: SupabotContext,
        threatCache: GlobalThreat | null,
        unitTypeRequests: Map<string, UnitRequest>,
        logger: (message: string) => void,
    ) {
        const { game, player } = context;
        const { production: productionApi, actions: actionsApi } = player;
        const playerData = game.getPlayerData(player.name);
        this.queueStates = QUEUES.map((queueType) => {
            const options = productionApi.getAvailableObjects(queueType);
            const items = QueueController.getPrioritiesForBuildingOptions(options, unitTypeRequests);
            const topItem = items.length > 0 ? items[items.length - 1] : undefined;
            return {
                queue: queueType,
                items,
                // only if the top item has a  priority above zero
                topItem: topItem && topItem.priority > 0 ? topItem : undefined,
            };
        });
        const totalWeightAcrossQueues = this.queueStates
            .map((decision) => decision.topItem?.priority!)
            .reduce((pV, cV) => pV + cV, 0);
        const totalCostAcrossQueues = this.queueStates
            .map((decision) => decision.topItem?.unit.cost!)
            .reduce((pV, cV) => pV + cV, 0);

        this.queueStates.forEach((decision) => {
            this.updateBuildQueue(
                game,
                productionApi,
                actionsApi,
                playerData,
                threatCache,
                unitTypeRequests,
                decision.queue,
                decision.topItem,
                totalWeightAcrossQueues,
                totalCostAcrossQueues,
                logger,
            );
        });

        // Repair is simple - just repair everything that's damaged.
        if (playerData.credits > 0 && game.getCurrentTick() > this.lastRepairCheckAt + REPAIR_CHECK_INTERVAL) {
            game.getVisibleUnits(playerData.name, "self", (r) => r.repairable).forEach((unitId) => {
                const unit = game.getUnitData(unitId);
                if (!unit || !unit.hitPoints || !unit.maxHitPoints || unit.hasWrenchRepair) {
                    return;
                }
                if (unit.hitPoints < unit.maxHitPoints) {
                    actionsApi.toggleRepairWrench(unitId);
                }
            });
            this.lastRepairCheckAt = game.getCurrentTick();
        }
    }

    private updateBuildQueue(
        game: GameApi,
        productionApi: ProductionApi,
        actionsApi: ActionsApi,
        playerData: PlayerData,
        threatCache: GlobalThreat | null,
        unitTypeRequests: Map<string, UnitRequest>,
        queueType: QueueType,
        decision: TechnoRulesWithPriority | undefined,
        totalWeightAcrossQueues: number,
        totalCostAcrossQueues: number,
        logger: (message: string) => void,
    ): void {
        const myCredits = playerData.credits;

        const queueData = productionApi.getQueueData(queueType);
        if (queueData.status == QueueStatus.Idle) {
            // Start building the decided item.
            if (decision !== undefined) {
                logger(`Decision (${queueTypeToName(queueType)}): ${decision.unit.name}`);
                actionsApi.queueForProduction(queueType, decision.unit.name, decision.unit.type, 1);
            }
        } else if (queueData.status == QueueStatus.Ready && queueData.items.length > 0) {
            if (isBuildingQueue(queueType)) {
                const readyUnit = queueData.items[0].rules;
                const currentRequest = unitTypeRequests.get(readyUnit.name);
                if (!currentRequest) {
                    // No one is requesting this anymore, cancel
                    logger(`Cancelling ready ${readyUnit.name} because no one is requesting anymore`);
                    actionsApi.unqueueFromProduction(queueType, readyUnit.name, readyUnit.type, 1);
                    return;
                }
                if (!currentRequest.specificLocation) {
                    // No one is requesting this anymore, cancel
                    logger(`Cancelling ready ${readyUnit.name} because location is unspecified`);
                    actionsApi.unqueueFromProduction(queueType, readyUnit.name, readyUnit.type, 1);
                    return;
                }
                actionsApi.placeBuilding(
                    readyUnit.name,
                    currentRequest.specificLocation.x,
                    currentRequest.specificLocation.y,
                );
            }
        } else if (queueData.status == QueueStatus.Active && queueData.items.length > 0 && decision != null) {
            // Consider cancelling if something else is significantly higher priority than what is currently being produced.

            const currentProduction = queueData.items[0].rules;
            if (decision.unit != currentProduction) {
                // Changing our mind.
                const currentRequest = unitTypeRequests.get(currentProduction.name);
                const currentItemPriority = currentRequest ? currentRequest.priority : 0;
                const newItemPriority = decision.priority;
                if (newItemPriority > currentItemPriority * 2) {
                    logger(
                        `Dequeueing queue ${queueTypeToName(queueData.type)} unit ${currentProduction.name} because ${
                            decision.unit.name
                        } has 2x higher priority.`,
                    );
                    actionsApi.unqueueFromProduction(queueData.type, currentProduction.name, currentProduction.type, 1);
                }
            } else {
                // Not changing our mind, but maybe other queues are more important for now.
                if (totalCostAcrossQueues > myCredits && decision.priority < totalWeightAcrossQueues * 0.25) {
                    logger(
                        `Pausing queue ${queueTypeToName(queueData.type)} because weight is low (${
                            decision.priority
                        }/${totalWeightAcrossQueues})`,
                    );
                    actionsApi.pauseProduction(queueData.type);
                }
            }
        } else if (queueData.status == QueueStatus.OnHold) {
            // Consider resuming queue if priority is high relative to other queues.
            if (myCredits >= totalCostAcrossQueues) {
                logger(`Resuming queue ${queueTypeToName(queueData.type)} because credits are high`);
                actionsApi.resumeProduction(queueData.type);
            } else if (decision && decision.priority >= totalWeightAcrossQueues * 0.25) {
                logger(
                    `Resuming queue ${queueTypeToName(queueData.type)} because weight is high (${
                        decision.priority
                    }/${totalWeightAcrossQueues})`,
                );
                actionsApi.resumeProduction(queueData.type);
            }
        }
    }

    private static getPrioritiesForBuildingOptions(
        options: TechnoRules[],
        unitTypeRequests: Map<string, UnitRequest>,
    ): TechnoRulesWithPriority[] {
        let priorityQueue: TechnoRulesWithPriority[] = [];
        options.forEach((option) => {
            const priority = unitTypeRequests.get(option.name)?.priority ?? 0;
            if (priority > 0) {
                priorityQueue.push({ unit: option, priority });
            }
        });

        priorityQueue = priorityQueue.sort((a, b) => a.priority - b.priority);
        return priorityQueue;
    }

    public getGlobalDebugText(gameApi: GameApi, productionApi: ProductionApi) {
        const productionState = QUEUES.reduce((prev, queueType) => {
            if (productionApi.getQueueData(queueType).size === 0) {
                return prev;
            }
            const paused = productionApi.getQueueData(queueType).status === QueueStatus.OnHold;
            return (
                prev +
                " [" +
                queueTypeToName(queueType) +
                (paused ? " PAUSED" : "") +
                ": " +
                productionApi
                    .getQueueData(queueType)
                    .items.map((item) => item.rules.name + (item.quantity > 1 ? "x" + item.quantity : "")) +
                "]"
            );
        }, "");

        const queueStates = this.queueStates
            .filter((queueState) => queueState.items.length > 0)
            .map((queueState) => {
                const queueString = queueState.items
                    .map((item) => item.unit.name + "(" + Math.round(item.priority * 10) / 10 + ")")
                    .join(", ");
                return `${queueTypeToName(queueState.queue)} Prios: ${queueString}\n`;
            })
            .join("");

        return `Production: ${productionState}\n${queueStates}`;
    }
}
