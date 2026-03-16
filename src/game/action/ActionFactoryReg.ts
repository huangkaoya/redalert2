import { OrderActionContext } from './OrderActionContext';
import { ActionType } from './ActionType';
import { NoActionFactory } from './factories/NoActionFactory';
import { PlaceBuildingActionFactory } from './factories/PlaceBuildingActionFactory';
import { SellObjectActionFactory } from './factories/SellObjectActionFactory';
import { SelectUnitsActionFactory } from './factories/SelectUnitsActionFactory';
import { OrderUnitsActionFactory } from './factories/OrderUnitsActionFactory';
import { UpdateQueueActionFactory } from './factories/UpdateQueueActionFactory';
import { DropPlayerActionFactory } from './factories/DropPlayerActionFactory';
import { ToggleRepairActionFactory } from './factories/ToggleRepairActionFactory';
import { ToggleAllianceActionFactory } from './factories/ToggleAllianceFactory';
import { ActivateSuperWeaponActionFactory } from './factories/ActivateSuperWeaponActionFactory';
import { PingLocationActionFactory } from './factories/PingLocationActionFactory';
import { ObserveGameActionFactory } from './factories/ObserveGameActionFactory';
import { ResignGameActionFactory } from './factories/ResignGameActionFactory';
import { DebugActionFactory } from './factories/DebugActionFactory';
export class ActionFactoryReg {
    register(actionRegistry: any, gameContext: any, playerContext: any): void {
        const orderActionContext = new OrderActionContext();
        actionRegistry.registerFactory(ActionType.NoAction, new NoActionFactory());
        actionRegistry.registerFactory(ActionType.PlaceBuilding, new PlaceBuildingActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.SellObject, new SellObjectActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.ToggleRepair, new ToggleRepairActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.SelectUnits, new SelectUnitsActionFactory(gameContext, orderActionContext));
        actionRegistry.registerFactory(ActionType.OrderUnits, new OrderUnitsActionFactory(gameContext, gameContext.map, orderActionContext));
        actionRegistry.registerFactory(ActionType.UpdateQueue, new UpdateQueueActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.ToggleAlliance, new ToggleAllianceActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.ActivateSuperWeapon, new ActivateSuperWeaponActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.PingLocation, new PingLocationActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.DropPlayer, new DropPlayerActionFactory(gameContext, playerContext));
        actionRegistry.registerFactory(ActionType.ObserveGame, new ObserveGameActionFactory(gameContext));
        actionRegistry.registerFactory(ActionType.ResignGame, new ResignGameActionFactory(gameContext, playerContext));
        actionRegistry.registerFactory(ActionType.DebugCommand, new DebugActionFactory(gameContext));
    }
}
