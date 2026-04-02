import { TagRepeatType } from "@/data/map/tag/TagRepeatType";
import { TriggerExecutorFactory } from "@/game/trigger/TriggerExecutorFactory";
import { TriggerConditionFactory } from "@/game/trigger/TriggerConditionFactory";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { Variable } from "@/data/map/Variable";
import { Trigger } from "@/data/map/trigger/Trigger";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
import { TriggerExecutor } from "@/game/trigger/TriggerExecutor";
import { MapObject } from "@/data/map/MapObjects";
interface TriggerInstance {
    trigger: Trigger;
    conditions: TriggerCondition[];
    targets: MapObject[];
    remainingTargets: Set<MapObject>;
    disabled: boolean;
    finished: boolean;
}
export class TriggerManager {
    private disposables: CompositeDisposable;
    private triggerInstances: Map<string, TriggerInstance>;
    private targetsByTag: Map<string, MapObject[]>;
    private conditionFactory: TriggerConditionFactory;
    private executorFactory: TriggerExecutorFactory;
    private pendingGameEvents: any[];
    private globalVariables: Map<string, Variable>;
    private localVariables: Map<string, Variable>;
    constructor() {
        this.disposables = new CompositeDisposable();
        this.triggerInstances = new Map();
        this.targetsByTag = new Map();
        this.conditionFactory = new TriggerConditionFactory();
        this.executorFactory = new TriggerExecutorFactory();
        this.pendingGameEvents = [];
        this.globalVariables = new Map();
        this.localVariables = new Map();
    }
    init(context: GameContext): void {
        const initialObjects = context.map.getInitialMapObjects()["technos"];
        for (const obj of initialObjects) {
            if (obj.tag) {
                let targets = this.targetsByTag.get(obj.tag);
                if (!targets) {
                    targets = [];
                    this.targetsByTag.set(obj.tag, targets);
                }
                const tile = context.map.tiles.getByMapCoords(obj.rx, obj.ry);
                if (tile) {
                    const mapObj = context.map.getObjectsOnTile(tile)
                        .find(e => e.name === obj.name && e.type === obj.type);
                    if (mapObj) {
                        targets.push(mapObj);
                    }
                }
            }
        }
        for (const cellTag of context.map.getCellTags()) {
            const tile = context.map.tiles.getByMapCoords(cellTag.coords.x, cellTag.coords.y);
            if (tile) {
                let targets = this.targetsByTag.get(cellTag.tagId);
                if (!targets) {
                    targets = [];
                    this.targetsByTag.set(cellTag.tagId, targets);
                }
                targets.push(tile);
            }
            else {
                console.warn(`CellTag out of bounds at (${cellTag.coords.x}, ${cellTag.coords.y}). Skipping.`);
            }
        }
        for (const [id, variable] of context.map.getVariables()) {
            this.localVariables.set(id, variable.clone());
        }
        for (const trigger of context.map.getTriggers()) {
            this.triggerInstances.set(trigger.id, this.createTriggerInstance(trigger, context));
        }
        this.disposables.add(context.events.subscribe(event => this.pendingGameEvents.push(event)));
    }
    private createTriggerInstance(trigger: Trigger, context: GameContext): TriggerInstance {
        const targets = this.targetsByTag.get(trigger.tag.id) ?? [];
        return {
            trigger,
            conditions: trigger.events
                .map(event => {
                const condition = this.conditionFactory.create(event, trigger);
                condition.setTargets(targets);
                condition.init(context);
                return condition;
            })
                .sort((a, b) => Number(b.blocking) - Number(a.blocking)),
            targets,
            remainingTargets: new Set(trigger.tag.repeatType === TagRepeatType.OnceAll ? targets : []),
            disabled: trigger.disabled,
            finished: false
        };
    }
    update(context: GameContext): void {
        const events = this.pendingGameEvents.splice(0, this.pendingGameEvents.length);
        for (const instance of this.triggerInstances.values()) {
            if (!instance.finished && !instance.disabled) {
                let allConditionsMet = true;
                const triggeredTargets: MapObject[] = [];
                for (const condition of instance.conditions) {
                    const result = condition.check(context, events);
                    if (typeof result === "boolean") {
                        if (!result) {
                            allConditionsMet = false;
                        }
                    }
                    else if (result.length) {
                        triggeredTargets.push(...result);
                    }
                    else {
                        allConditionsMet = false;
                    }
                    if (condition.blocking && !allConditionsMet) {
                        break;
                    }
                }
                if (allConditionsMet) {
                    const trigger = instance.trigger;
                    instance.conditions.forEach(condition => condition.reset?.());
                    let targets: MapObject[] = [];
                    if (trigger.tag.repeatType === TagRepeatType.OnceAll) {
                        for (const target of triggeredTargets) {
                            instance.remainingTargets.delete(target);
                        }
                        if (instance.remainingTargets.size) {
                            continue;
                        }
                        targets = triggeredTargets.length ? [triggeredTargets[triggeredTargets.length - 1]] : [];
                    }
                    else {
                        targets = instance.targets;
                    }
                    this.executeActions(trigger, targets, context);
                    if (trigger.tag.repeatType !== TagRepeatType.Repeat) {
                        instance.finished = true;
                    }
                }
            }
        }
    }
    private executeActions(trigger: Trigger, targets: MapObject[], context: GameContext): void {
        for (const action of trigger.actions) {
            const executor = this.executorFactory.create(action, trigger);
            executor.execute(context, targets as any);
        }
    }
    setTriggerEnabled(triggerId: string, enabled: boolean): void {
        const instance = this.triggerInstances.get(triggerId);
        if (instance) {
            instance.disabled = !enabled;
        }
    }
    forceTrigger(triggerId: string, context: GameContext): void {
        const instance = this.triggerInstances.get(triggerId);
        if (instance) {
            this.executeActions(instance.trigger, instance.targets, context);
        }
    }
    destroyTrigger(triggerId: string): void {
        this.triggerInstances.delete(triggerId);
    }
    destroyTag(tagId: string): void {
        const triggerIds: string[] = [];
        for (const [id, instance] of this.triggerInstances) {
            if (instance.trigger.tag.id === tagId) {
                triggerIds.push(id);
            }
        }
        for (const id of triggerIds) {
            this.destroyTrigger(id);
        }
    }
    getGlobalVariable(id: string): boolean {
        return !!this.globalVariables.get(id)?.value;
    }
    toggleGlobalVariable(id: string, value: boolean): void {
        const variable = this.globalVariables.get(id);
        if (variable === undefined) {
            this.globalVariables.set(id, new Variable("No name", value));
        }
        else {
            variable.value = value;
        }
    }
    getLocalVariable(id: string): boolean {
        return !!this.localVariables.get(id)?.value;
    }
    toggleLocalVariable(id: string, value: boolean): void {
        const variable = this.localVariables.get(id);
        if (variable === undefined) {
            this.localVariables.set(id, new Variable("No name", value));
        }
        else {
            variable.value = value;
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
