import { TriggerActionType } from "@/data/map/trigger/TriggerActionType";
import { AddSuperWeaponExecutor } from "@/game/trigger/executor/AddSuperWeaponExecutor";
import { ApplyDamageExecutor } from "@/game/trigger/executor/ApplyDamageExecutor";
import { ChangeHouseAllExecutor } from "@/game/trigger/executor/ChangeHouseAllExecutor";
import { ChangeHouseExecutor } from "@/game/trigger/executor/ChangeHouseExecutor";
import { CheerExecutor } from "@/game/trigger/executor/CheerExecutor";
import { CreateCrateExecutor } from "@/game/trigger/executor/CreateCrateExecutor";
import { CreateRadarEventExecutor } from "@/game/trigger/executor/CreateRadarEventExecutor";
import { DestroyObjectExecutor } from "@/game/trigger/executor/DestroyObjectExecutor";
import { DestroyTagExecutor } from "@/game/trigger/executor/DestroyTagExecutor";
import { DestroyTriggerExecutor } from "@/game/trigger/executor/DestroyTriggerExecutor";
import { DetonateWarheadExecutor } from "@/game/trigger/executor/DetonateWarheadExecutor";
import { EvictOccupiersExecutor } from "@/game/trigger/executor/EvictOccupiersExecutor";
import { FireSaleExecutor } from "@/game/trigger/executor/FireSaleExecutor";
import { ForceEndExecutor } from "@/game/trigger/executor/ForceEndExecutor";
import { ForceTriggerExecutor } from "@/game/trigger/executor/ForceTriggerExecutor";
import { GlobalVariableExecutor } from "@/game/trigger/executor/GlobalVariableExecutor";
import { IronCurtainExecutor } from "@/game/trigger/executor/IronCurtainExecutor";
import { LightningStrikeExecutor } from "@/game/trigger/executor/LightningStrikeExecutor";
import { LocalVariableExecutor } from "@/game/trigger/executor/LocalVariableExecutor";
import { NoActionExecutor } from "@/game/trigger/executor/NoActionExecutor";
import { NukeStrikeExecutor } from "@/game/trigger/executor/NukeStrikeExecutor";
import { PlayAnimAtExecutor } from "@/game/trigger/executor/PlayAnimAtExecutor";
import { PlaySoundFxAtExecutor } from "@/game/trigger/executor/PlaySoundFxAtExecutor";
import { PlaySoundFxExecutor } from "@/game/trigger/executor/PlaySoundFxExecutor";
import { PlaySpeechExecutor } from "@/game/trigger/executor/PlaySpeechExecutor";
import { ReshroudMapExecutor } from "@/game/trigger/executor/ReshroudMapExecutor";
import { ResizePlayerViewExecutor } from "@/game/trigger/executor/ResizePlayerViewExecutor";
import { RevealAroundWaypointExecutor } from "@/game/trigger/executor/RevealAroundWaypointExecutor";
import { RevealMapExecutor } from "@/game/trigger/executor/RevealMapExecutor";
import { SellBuildingExecutor } from "@/game/trigger/executor/SellBuildingExecutor";
import { SetAmbientLightExecutor } from "@/game/trigger/executor/SetAmbientLightExecutor";
import { SetAmbientRateExecutor } from "@/game/trigger/executor/SetAmbientRateExecutor";
import { SetAmbientStepExecutor } from "@/game/trigger/executor/SetAmbientStepExecutor";
import { StopSoundFxAtExecutor } from "@/game/trigger/executor/StopSoundFxAtExecutor";
import { TextTriggerExecutor } from "@/game/trigger/executor/TextTriggerExecutor";
import { TimerExtendExecutor } from "@/game/trigger/executor/TimerExtendExecutor";
import { TimerSetExecutor } from "@/game/trigger/executor/TimerSetExecutor";
import { TimerShortenExecutor } from "@/game/trigger/executor/TimerShortenExecutor";
import { TimerStartExecutor } from "@/game/trigger/executor/TimerStartExecutor";
import { TimerStopExecutor } from "@/game/trigger/executor/TimerStopExecutor";
import { TimerTextExecutor } from "@/game/trigger/executor/TimerTextExecutor";
import { ToggleTriggerExecutor } from "@/game/trigger/executor/ToggleTriggerExecutor";
import { TurnOnOffBuildingExecutor } from "@/game/trigger/executor/TurnOnOffBuildingExecutor";
import { UnrevealAroundWaypointExecutor } from "@/game/trigger/executor/UnrevealAroundWaypointExecutor";
export class TriggerExecutorFactory {
    create(e: any, t: any) {
        switch (e.type) {
            case TriggerActionType.NoAction:
                return new NoActionExecutor(e, t);
            case TriggerActionType.FireSale:
                return new FireSaleExecutor(e, t);
            case TriggerActionType.TextTrigger:
                return new TextTriggerExecutor(e, t);
            case TriggerActionType.DestroyTrigger:
                return new DestroyTriggerExecutor(e, t);
            case TriggerActionType.ChangeHouse:
                return new ChangeHouseExecutor(e, t);
            case TriggerActionType.RevealMap:
                return new RevealMapExecutor(e, t);
            case TriggerActionType.RevealAroundWaypoint:
                return new RevealAroundWaypointExecutor(e, t);
            case TriggerActionType.PlaySoundFx:
                return new PlaySoundFxExecutor(e, t);
            case TriggerActionType.PlaySpeech:
                return new PlaySpeechExecutor(e, t);
            case TriggerActionType.ForceTrigger:
                return new ForceTriggerExecutor(e, t);
            case TriggerActionType.TimerStart:
                return new TimerStartExecutor(e, t);
            case TriggerActionType.TimerStop:
                return new TimerStopExecutor(e, t);
            case TriggerActionType.TimerExtend:
                return new TimerExtendExecutor(e, t);
            case TriggerActionType.TimerShorten:
                return new TimerShortenExecutor(e, t);
            case TriggerActionType.TimerSet:
                return new TimerSetExecutor(e, t);
            case TriggerActionType.GlobalSet:
                return new GlobalVariableExecutor(e, t, true);
            case TriggerActionType.GlobalClear:
                return new GlobalVariableExecutor(e, t, false);
            case TriggerActionType.DestroyObject:
                return new DestroyObjectExecutor(e, t);
            case TriggerActionType.AddOneTimeSuperWeapon:
                return new AddSuperWeaponExecutor(e, t, true);
            case TriggerActionType.AddRepeatingSuperWeapon:
                return new AddSuperWeaponExecutor(e, t, false);
            case TriggerActionType.AllChangeHouse:
                return new ChangeHouseAllExecutor(e, t);
            case TriggerActionType.ResizePlayerView:
                return new ResizePlayerViewExecutor(e, t);
            case TriggerActionType.PlayAnimAt:
                return new PlayAnimAtExecutor(e, t);
            case TriggerActionType.DetonateWarhead:
                return new DetonateWarheadExecutor(e, t);
            case TriggerActionType.ReshroudMap:
                return new ReshroudMapExecutor(e, t);
            case TriggerActionType.EnableTrigger:
                return new ToggleTriggerExecutor(e, t, true);
            case TriggerActionType.DisableTrigger:
                return new ToggleTriggerExecutor(e, t, false);
            case TriggerActionType.CreateRadarEvent:
                return new CreateRadarEventExecutor(e, t);
            case TriggerActionType.LocalSet:
                return new LocalVariableExecutor(e, t, true);
            case TriggerActionType.LocalClear:
                return new LocalVariableExecutor(e, t, false);
            case TriggerActionType.SellBuilding:
                return new SellBuildingExecutor(e, t);
            case TriggerActionType.TurnOffBuilding:
                return new TurnOnOffBuildingExecutor(e, t, false);
            case TriggerActionType.TurnOnBuilding:
                return new TurnOnOffBuildingExecutor(e, t, true);
            case TriggerActionType.ApplyOneHundredDamage:
                return new ApplyDamageExecutor(e, t, 100);
            case TriggerActionType.ForceEnd:
                return new ForceEndExecutor(e, t);
            case TriggerActionType.DestroyTag:
                return new DestroyTagExecutor(e, t);
            case TriggerActionType.SetAmbientStep:
                return new SetAmbientStepExecutor(e, t);
            case TriggerActionType.SetAmbientRate:
                return new SetAmbientRateExecutor(e, t);
            case TriggerActionType.SetAmbientLight:
                return new SetAmbientLightExecutor(e, t);
            case TriggerActionType.NukeStrike:
                return new NukeStrikeExecutor(e, t);
            case TriggerActionType.PlaySoundFxAt:
                return new PlaySoundFxAtExecutor(e, t);
            case TriggerActionType.UnrevealAroundWaypoint:
                return new UnrevealAroundWaypointExecutor(e, t);
            case TriggerActionType.LightningStrike:
                return new LightningStrikeExecutor(e, t);
            case TriggerActionType.TimerText:
                return new TimerTextExecutor(e, t);
            case TriggerActionType.CreateCrate:
                return new CreateCrateExecutor(e, t);
            case TriggerActionType.IronCurtainAt:
                return new IronCurtainExecutor(e, t);
            case TriggerActionType.EvictOccupiers:
                return new EvictOccupiersExecutor(e, t);
            case TriggerActionType.Cheer:
                return new CheerExecutor(e, t);
            case TriggerActionType.StopSoundsAt:
                return new StopSoundFxAtExecutor(e, t);
            default:
                throw new Error(`Unhandled action type "${TriggerActionType[e.type]}"`);
        }
    }
}
