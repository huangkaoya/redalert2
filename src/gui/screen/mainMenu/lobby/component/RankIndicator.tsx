import React from 'react';
import { Image } from '@/gui/component/Image';
import { PlayerRankType } from '@/network/ladder/PlayerRankType';
const RANK_ICONS = new Map<PlayerRankType, string>()
    .set(PlayerRankType.Private, "private")
    .set(PlayerRankType.Corporal, "corporal")
    .set(PlayerRankType.Sergeant, "sergeant")
    .set(PlayerRankType.Lieutenant, "lieutena")
    .set(PlayerRankType.Major, "major")
    .set(PlayerRankType.Colonel, "colonel")
    .set(PlayerRankType.BrigGeneral, "briggenr")
    .set(PlayerRankType.General, "general")
    .set(PlayerRankType.FiveStarGeneral, "stargen")
    .set(PlayerRankType.CommanderInChief, "comchief");
const RANK_LABELS = new Map<PlayerRankType, string>()
    .set(PlayerRankType.Private, "GUI:RankPrivate")
    .set(PlayerRankType.Corporal, "GUI:RankCorporal")
    .set(PlayerRankType.Sergeant, "GUI:RankSergeant")
    .set(PlayerRankType.Lieutenant, "GUI:RankLieutenant")
    .set(PlayerRankType.Major, "GUI:RankMajor")
    .set(PlayerRankType.Colonel, "GUI:RankColonel")
    .set(PlayerRankType.BrigGeneral, "GUI:RankBrigGeneral")
    .set(PlayerRankType.General, "GUI:RankGeneral")
    .set(PlayerRankType.FiveStarGeneral, "GUI:RankFiveStar")
    .set(PlayerRankType.CommanderInChief, "GUI:RankCmdInChief");
interface RankIndicatorProps {
    playerProfile?: {
        name: string;
        rankType: PlayerRankType;
    };
    strings: {
        get: (key: string) => string;
    };
}
export const RankIndicator: React.FC<RankIndicatorProps> = ({ playerProfile, strings }) => {
    const rankType = playerProfile?.rankType ?? PlayerRankType.None;
    const tooltip = playerProfile
        ? rankType !== PlayerRankType.None
            ? `${playerProfile.name} : ${strings.get(RANK_LABELS.get(rankType)!)}`
            : `${playerProfile.name} : ${strings.get("TXT_UNRANKED")}`
        : undefined;
    return (<div className="rank-indicator" data-r-tooltip={tooltip}>
      {rankType !== PlayerRankType.None && (<Image src={`${RANK_ICONS.get(rankType)}.pcx`}/>)}
    </div>);
};
