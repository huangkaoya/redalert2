import { FactoryType } from "@/game/rules/TechnoRules";
import { ProductionQueue, QueueType, QueueStatus } from "@/game/player/production/ProductionQueue";
import { ObjectType } from "@/engine/type/ObjectType";
import { DockTrait } from "@/game/gameobject/trait/DockTrait";
import { SidebarModel, SidebarItemTargetType, SidebarItemStatus, SidebarCategory } from "./SidebarModel";
import { SuperWeapon, SuperWeaponStatus } from "@/game/SuperWeapon";

type SidebarTechnoItem = {
  target: {
    type: SidebarItemTargetType.Techno;
    rules: any;
  };
  cameo: any;
  disabled: boolean;
  progress: number;
  quantity: number;
  status: SidebarItemStatus;
};

type SidebarSpecialItem = {
  target: {
    type: SidebarItemTargetType.Special;
    rules: any;
  };
  cameo: any;
  disabled: boolean;
  progress: number;
  quantity: number;
  status: SidebarItemStatus;
};

const superWeaponStatusToSidebarStatus = new Map<SuperWeaponStatus, SidebarItemStatus>()
  .set(SuperWeaponStatus.Charging, SidebarItemStatus.Started)
  .set(SuperWeaponStatus.Paused, SidebarItemStatus.OnHold)
  .set(SuperWeaponStatus.Ready, SidebarItemStatus.Ready);

export class CombatantSidebarModel extends SidebarModel {
  player: any;
  rules: any;

  get credits(): number {
    return Math.floor(this.player.credits);
  }

  get radarEnabled(): boolean {
    return !!this.player.radarTrait && !this.player.radarTrait.isDisabled();
  }

  constructor(player: any, game: any) {
    super(game);
    this.player = player;
    this.rules = game.rules;
  }

  computePurchaseCost(rules: any): number {
    return this.game.sellTrait.computePurchaseValue(rules, this.player);
  }

  updateAvailableObjects(game: any) {
    if (!this.player.production) throw new Error("Player is not a combatant");
    const availableObjects = this.sortAvailableObjects(
      this.player.production.getAvailableObjects()
    );
    for (const tab of this.tabs) {
      tab.items.length = 0;
      tab.needsUpdate = true;
    }
    this.updateSuperWeaponItems();
    for (const obj of availableObjects) {
      const objRules = game.getObject(obj.name, obj.type);
      const tab = this.tabs[
        this.getSidebarCategoryForQueueType(
          this.player.production.getQueueTypeForObject(obj)
        )
      ];
      const queue = this.player.production.getQueueForObject(obj);
      const factoryType = this.player.production.getFactoryTypeForQueueType(queue.type);
      const item: SidebarTechnoItem = {
        target: {
          type: SidebarItemTargetType.Techno,
          rules: obj,
        },
        cameo:
          this.player.production.hasVeteranType(factoryType) && obj.trainable
            ? objRules.altCameo
            : objRules.cameo,
        disabled: false,
        progress: 0,
        quantity: 0,
        status: SidebarItemStatus.Idle,
      };
      tab.items.push(item);
      this.updateSidebarTechnoItem(item, queue, this.player.production);
    }
    for (const tab of this.tabs) {
      this.updateTabFlashing(tab);
    }
    this.updateActiveTab();
  }

  updateActiveTab() {
    if (this.activeTab.items.length !== 0) return;
    const found = this.tabs.find((tab) => tab.items.length > 0)?.id;
    if (found !== undefined) {
      this.selectTab(found);
    }
  }

  updateFromQueue(queue: any) {
    if (!this.player.production) throw new Error("Player is not a combatant");
    const tab = this.tabs[this.getSidebarCategoryForQueueType(queue.type)];
    tab.needsUpdate = true;
    for (const item of tab.items) {
      if (
        item.target.type === SidebarItemTargetType.Techno &&
        this.player.production.getQueueForObject(item.target.rules) === queue
      ) {
        this.updateSidebarTechnoItem(item, queue, this.player.production);
      }
    }
    this.updateTabFlashing(tab);
  }

  updateSuperWeapons() {
    this.updateSuperWeaponItems();
    this.updateActiveTab();
  }

  updateSuperWeaponItems() {
    const superWeapons = this.player.superWeaponsTrait
      ?.getAll()
      .slice()
      .sort(
        (a: any, b: any) =>
          1000 * (a.rules.rechargeTime - b.rules.rechargeTime) +
          a.name.charCodeAt(0) -
          b.name.charCodeAt(0)
      );
    const tab = this.tabs[SidebarCategory.Armory];
    tab.needsUpdate = true;
    let firstTechnoIdx = tab.items.findIndex(
      (item: any) => item.target.type === SidebarItemTargetType.Techno
    );
    if (firstTechnoIdx !== -1) {
      tab.items.splice(0, firstTechnoIdx);
    } else {
      tab.items.length = 0;
    }
    const items =
      superWeapons?.map((sw: any) => {
        const status = superWeaponStatusToSidebarStatus.get(sw.status);
        if (status === undefined) {
          throw new Error(`Unhandled super weapon status "${sw.status}"`);
        }
        const item: SidebarSpecialItem = {
          target: {
            type: SidebarItemTargetType.Special,
            rules: sw.rules,
          },
          cameo: sw.rules.sidebarImage,
          disabled: false,
          progress: sw.getChargeProgress(),
          quantity: 1,
          status,
        };
        return item;
      }) ?? [];
    if (items.length) {
      tab.items.unshift(...items);
    }
    this.updateTabFlashing(tab);
  }

  updateTabFlashing(tab: any) {
    tab.flashing = tab.items.some(
      (item: any) => item.status === SidebarItemStatus.Ready
    );
  }

  updateSidebarTechnoItem(
    item: SidebarTechnoItem,
    queue: any,
    production: any
  ) {
    if (item.target.type === SidebarItemTargetType.Special) {
      throw new Error("Sidebar item must be of type Techno");
    }
    const rules = item.target.rules;
    const buildings = [...this.player.buildings];
    let buildLimitReached = false;
    if (Number.isFinite(rules.buildLimit)) {
      let builtCount: number;
      if (rules.buildLimit >= 0) {
        builtCount = (rules.type === ObjectType.Building
          ? buildings
          : this.player.getOwnedObjectsByType(rules.type, true)
        ).filter((o: any) => o.name === rules.name).length;
      } else {
        builtCount = this.player.getLimitedUnitsBuilt(rules.name);
      }
      buildLimitReached = builtCount >= Math.abs(rules.buildLimit);
    }
    // padAircraft check
    if (this.rules.general.padAircraft.includes(rules.name)) {
      const totalPads = buildings
        .filter(
          (b: any) =>
            b.factoryTrait?.type === FactoryType.AircraftType &&
            b.helipadTrait
        )
        .reduce(
          (sum: number, b: any) =>
            sum + (b.traits.find((t: any) => t instanceof DockTrait)?.numberOfDocks ?? 0),
          0
        );
      const ownedAircraft = [
        ...this.player.getOwnedObjectsByType(ObjectType.Aircraft, true),
      ].filter((o: any) => this.rules.general.padAircraft.includes(o.name)).length;
      buildLimitReached = buildLimitReached || ownedAircraft >= totalPads;
    }
    const factoryType = production.getFactoryTypeForQueueType(queue.type);
    const availableFactories = buildings.filter(
      (b: any) =>
        b.factoryTrait?.type === factoryType && !b.warpedOutTrait.isActive()
    );
    const found = queue.find(rules);
    item.progress = found.length ? found[0].progress : 0;
    item.quantity = found.reduce((sum: number, q: any) => sum + q.quantity, 0);
    item.status = this.computeStatus(queue, found[0]);
    item.disabled =
      (queue.maxSize === 1 && found[0] !== queue.getFirst()) ||
      buildLimitReached ||
      (!availableFactories.length &&
        (!queue.currentSize || found[0] !== queue.getFirst()));
  }

  getTabForQueueType(type: QueueType) {
    return this.tabs[this.getSidebarCategoryForQueueType(type)];
  }

  getSidebarCategoryForQueueType(type: QueueType): SidebarCategory {
    switch (type) {
      case QueueType.Structures:
        return SidebarCategory.Structures;
      case QueueType.Armory:
        return SidebarCategory.Armory;
      case QueueType.Infantry:
        return SidebarCategory.Infantry;
      case QueueType.Vehicles:
      case QueueType.Ships:
      case QueueType.Aircrafts:
        return SidebarCategory.Vehicles;
      default:
        throw new Error("Unhandled queueType " + QueueType[type]);
    }
  }

  computeStatus(queue: any, first: any): SidebarItemStatus {
    if (!first) return SidebarItemStatus.Idle;
    if (queue.getFirst() === first) {
      if (queue.status === QueueStatus.Ready) return SidebarItemStatus.Ready;
      if (queue.status === QueueStatus.OnHold) return SidebarItemStatus.OnHold;
      return SidebarItemStatus.Started;
    }
    return SidebarItemStatus.InQueue;
  }

  sortAvailableObjects(objects: any[]): any[] {
    return [...objects].sort((a, b) => {
      const aVal = this.getObjectTypeSortValue(a);
      const bVal = this.getObjectTypeSortValue(b);
      if (aVal === bVal) {
        if (a.aiBasePlanningSide === b.aiBasePlanningSide) {
          if (a.techLevel === b.techLevel) {
            return a.prerequisite.length < b.prerequisite.length ? -1 : 1;
          }
          return a.techLevel < b.techLevel ? -1 : 1;
        }
        return (a.aiBasePlanningSide ?? -1) < (b.aiBasePlanningSide ?? -1)
          ? -1
          : 1;
      }
      return aVal - bVal;
    });
  }

  getObjectTypeSortValue(obj: any): number {
    if (obj.type === ObjectType.Aircraft) return 1;
    if (obj.type === ObjectType.Vehicle) {
      if (obj.naval) return 2;
      if (obj.consideredAircraft) return 1;
      return 0;
    }
    return 0;
  }
}
