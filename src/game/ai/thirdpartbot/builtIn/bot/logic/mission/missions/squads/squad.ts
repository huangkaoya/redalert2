import { Mission, MissionAction } from "../../mission";
import { DebugLogger } from "../../../common/utils";
import { MissionContext } from "../../../common/context";

export interface Squad {
    onAiUpdate(context: MissionContext, mission: Mission<any>, logger: DebugLogger): MissionAction;

    getGlobalDebugText(): string | undefined;
}
