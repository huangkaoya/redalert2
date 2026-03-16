import React from "react";
import classNames from "classnames";
import { RankIndicator } from "@/gui/screen/mainMenu/lobby/component/RankIndicator";
import ChannelOpIndicator from "./ChannelOpIndicator";
interface ChannelUserProps {
    user: {
        name: string;
        operator?: boolean;
    };
    playerProfile?: {
        rank?: number;
        rankType?: string;
    };
    strings: {
        get: (key: string) => string;
    };
    onClick?: () => void;
}
const RANK_LABELS = RankIndicator.RANK_LABELS || new Map();
const ChannelUser: React.FC<ChannelUserProps> = ({ user, playerProfile, strings, onClick, }) => {
    let tooltip = user.name;
    if (user.operator) {
        tooltip += " : " + strings.get("TXT_OPER");
    }
    tooltip +=
        playerProfile && playerProfile.rank !== undefined
            ? " : " + strings.get(RANK_LABELS.get(playerProfile.rankType))
            : " : " + strings.get("TXT_UNRANKED");
    return (<div className={classNames("player", { operator: user.operator })} data-r-tooltip={tooltip} onClick={onClick}>
      <ChannelOpIndicator operator={!!user.operator}/>
      <RankIndicator playerProfile={playerProfile} strings={strings}/>
      {user.name}
    </div>);
};
export default ChannelUser;
