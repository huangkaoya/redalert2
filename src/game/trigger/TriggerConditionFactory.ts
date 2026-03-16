import { TriggerEventType } from "@/data/map/trigger/TriggerEventType";
import { ObjectType } from "@/engine/type/ObjectType";
import { AmbientLightCondition } from "@/game/trigger/condition/AmbientLightCondition";
import { AnyEventCondition } from "@/game/trigger/condition/AnyEventCondition";
import { AttackedByAnyCondition } from "@/game/trigger/condition/AttackedByAnyCondition";
import { AttackedByHouseCondition } from "@/game/trigger/condition/AttackedByHouseCondition";
import { BuildingExistsCondition } from "@/game/trigger/condition/BuildingExistsCondition";
import { BuildObjectTypeCondition } from "@/game/trigger/condition/BuildObjectTypeCondition";
import { ComesNearWaypointCondition } from "@/game/trigger/condition/ComesNearWaypointCondition";
import { CreditsBelowCondition } from "@/game/trigger/condition/CreditsBelowCondition";
import { CreditsExceedCondition } from "@/game/trigger/condition/CreditsExceedCondition";
import { CrossHorizLineCondition } from "@/game/trigger/condition/CrossHorizLineCondition";
import { CrossVertLineCondition } from "@/game/trigger/condition/CrossVertLineCondition";
import { DestroyedAllBuildingsCondition } from "@/game/trigger/condition/DestroyedAllBuildingsCondition";
import { DestroyedAllCondition } from "@/game/trigger/condition/DestroyedAllCondition";
import { DestroyedAllUnitsCondition } from "@/game/trigger/condition/DestroyedAllUnitsCondition";
import { DestroyedAllUnitsLandCondition } from "@/game/trigger/condition/DestroyedAllUnitsLandCondition";
import { DestroyedAllUnitsNavalCondition } from "@/game/trigger/condition/DestroyedAllUnitsNavalCondition";
import { DestroyedBridgeCondition } from "@/game/trigger/condition/DestroyedBridgeCondition";
import { DestroyedBuildingsCondition } from "@/game/trigger/condition/DestroyedBuildingsCondition";
import { DestroyedByAnyCondition } from "@/game/trigger/condition/DestroyedByAnyCondition";
import { DestroyedOrCapturedCondition } from "@/game/trigger/condition/DestroyedOrCapturedCondition";
import { DestroyedOrCapturedOrInfiltratedCondition } from "@/game/trigger/condition/DestroyedOrCapturedOrInfiltratedCondition";
import { DestroyedUnitsCondition } from "@/game/trigger/condition/DestroyedUnitsCondition";
import { ElapsedScenarioTimeCondition } from "@/game/trigger/condition/ElapsedScenarioTimeCondition";
import { ElapsedTimeCondition } from "@/game/trigger/condition/ElapsedTimeCondition";
import { EnteredByCondition } from "@/game/trigger/condition/EnteredByCondition";
import { GlobalVariableCondition } from "@/game/trigger/condition/GlobalVariableCondition";
import { HealthBelowAnyCondition } from "@/game/trigger/condition/HealthBelowAnyCondition";
import { HealthBelowCombatCondition } from "@/game/trigger/condition/HealthBelowCombatCondition";
import { LocalVariableCondition } from "@/game/trigger/condition/LocalVariableCondition";
import { LowPowerCondition } from "@/game/trigger/condition/LowPowerCondition";
import { NoEventCondition } from "@/game/trigger/condition/NoEventCondition";
import { NoFactoriesLeftCondition } from "@/game/trigger/condition/NoFactoriesLeftCondition";
import { PickupCrateAnyCondition } from "@/game/trigger/condition/PickupCrateAnyCondition";
import { PickupCrateCondition } from "@/game/trigger/condition/PickupCrateCondition";
import { RandomDelayCondition } from "@/game/trigger/condition/RandomDelayCondition";
import { SpiedByCondition } from "@/game/trigger/condition/SpiedByCondition";
import { SpyEnteringAsHouseCondition } from "@/game/trigger/condition/SpyEnteringAsHouseCondition";
import { SpyEnteringAsInfantryCondition } from "@/game/trigger/condition/SpyEnteringAsInfantryCondition";
import { TimerExpiredCondition } from "@/game/trigger/condition/TimerExpiredCondition";
export class TriggerConditionFactory {
    create(e: any, t: any) {
        switch (e.type) {
            case TriggerEventType.NoEvent:
                return new NoEventCondition(e, t);
            case TriggerEventType.EnteredBy:
                return new EnteredByCondition(e, t);
            case TriggerEventType.SpiedBy:
                return new SpiedByCondition(e, t);
            case TriggerEventType.AttackedByAny:
                return new AttackedByAnyCondition(e, t);
            case TriggerEventType.DestroyedByAny:
                return new DestroyedByAnyCondition(e, t);
            case TriggerEventType.AnyEvent:
                return new AnyEventCondition(e, t);
            case TriggerEventType.DestroyedAllUnits:
                return new DestroyedAllUnitsCondition(e, t);
            case TriggerEventType.DestroyedAllBuildings:
                return new DestroyedAllBuildingsCondition(e, t);
            case TriggerEventType.DestroyedAll:
                return new DestroyedAllCondition(e, t);
            case TriggerEventType.CreditsExceed:
                return new CreditsExceedCondition(e, t);
            case TriggerEventType.ElapsedTime:
                return new ElapsedTimeCondition(e, t);
            case TriggerEventType.MissionTimerExpired:
                return new TimerExpiredCondition(e, t);
            case TriggerEventType.DestroyedBuildings:
                return new DestroyedBuildingsCondition(e, t);
            case TriggerEventType.DestroyedUnits:
                return new DestroyedUnitsCondition(e, t);
            case TriggerEventType.NoFactoriesLeft:
                return new NoFactoriesLeftCondition(e, t);
            case TriggerEventType.BuildBuilding:
                return new BuildObjectTypeCondition(e, t, ObjectType.Building);
            case TriggerEventType.BuildUnit:
                return new BuildObjectTypeCondition(e, t, ObjectType.Vehicle);
            case TriggerEventType.BuildInfantry:
                return new BuildObjectTypeCondition(e, t, ObjectType.Infantry);
            case TriggerEventType.BuildAircraft:
                return new BuildObjectTypeCondition(e, t, ObjectType.Aircraft);
            case TriggerEventType.CrossesHorizontalLine:
                return new CrossHorizLineCondition(e, t);
            case TriggerEventType.CrossesVerticalLine:
                return new CrossVertLineCondition(e, t);
            case TriggerEventType.GlobalIsSet:
                return new GlobalVariableCondition(e, t, true);
            case TriggerEventType.GlobalIsCleared:
                return new GlobalVariableCondition(e, t, false);
            case TriggerEventType.DestroyedOrCaptured:
                return new DestroyedOrCapturedCondition(e, t);
            case TriggerEventType.LowPower:
                return new LowPowerCondition(e, t);
            case TriggerEventType.DestroyedBridge:
                return new DestroyedBridgeCondition(e, t);
            case TriggerEventType.BuildingExists:
                return new BuildingExistsCondition(e, t);
            case TriggerEventType.ComesNearWaypoint:
                return new ComesNearWaypointCondition(e, t);
            case TriggerEventType.LocalIsSet:
                return new LocalVariableCondition(e, t, true);
            case TriggerEventType.LocalIsCleared:
                return new LocalVariableCondition(e, t, false);
            case TriggerEventType.FirstDamagedCombat:
                return new HealthBelowCombatCondition(e, t, 100);
            case TriggerEventType.HalfHealthCombat:
                return new HealthBelowCombatCondition(e, t, 50);
            case TriggerEventType.QuarterHealthCombat:
                return new HealthBelowCombatCondition(e, t, 25);
            case TriggerEventType.FirstDamagedAny:
                return new HealthBelowAnyCondition(e, t, 100);
            case TriggerEventType.HalfHealthAny:
                return new HealthBelowAnyCondition(e, t, 50);
            case TriggerEventType.QuarterHealthAny:
                return new HealthBelowAnyCondition(e, t, 25);
            case TriggerEventType.AttackedByHouse:
                return new AttackedByHouseCondition(e, t);
            case TriggerEventType.AmbientLightBelow:
                return new AmbientLightCondition(e, t, "below");
            case TriggerEventType.AmbientLightAbove:
                return new AmbientLightCondition(e, t, "above");
            case TriggerEventType.ElapsedScenarioTime:
                return new ElapsedScenarioTimeCondition(e, t);
            case TriggerEventType.DestroyedOrCapturedOrInfiltrated:
                return new DestroyedOrCapturedOrInfiltratedCondition(e, t);
            case TriggerEventType.PickupCrate:
                return new PickupCrateCondition(e, t);
            case TriggerEventType.PickupCrateAny:
                return new PickupCrateAnyCondition(e, t);
            case TriggerEventType.RandomDelay:
                return new RandomDelayCondition(e, t);
            case TriggerEventType.CreditsBelow:
                return new CreditsBelowCondition(e, t);
            case TriggerEventType.SpyEnteringAsHouse:
                return new SpyEnteringAsHouseCondition(e, t);
            case TriggerEventType.SpyEnteringAsInfantry:
                return new SpyEnteringAsInfantryCondition(e, t);
            case TriggerEventType.DestroyedAllUnitsNaval:
                return new DestroyedAllUnitsNavalCondition(e, t);
            case TriggerEventType.DestroyedAllUnitsLand:
                return new DestroyedAllUnitsLandCondition(e, t);
            case TriggerEventType.BuildingNotExists:
                return new BuildingExistsCondition(e, t, true);
            default:
                throw new Error(`Unhandled trigger event type "${TriggerEventType[e.type]}"`);
        }
    }
}
