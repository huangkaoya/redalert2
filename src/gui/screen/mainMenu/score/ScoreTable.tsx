import React from "react";
import classnames from "classnames";
import { aiUiNames } from "@/game/gameopts/constants";
import { CountryIcon } from "@/gui/component/CountryIcon";
import { RankIndicator } from "@/gui/screen/mainMenu/lobby/component/RankIndicator";
import { WolGameReportResult } from "@/network/WolGameReport";
interface ScoreTableProps {
    game: any;
    singlePlayer: boolean;
    tournament: boolean;
    localPlayer: any;
    gameReport?: any;
    strings: any;
}
export const ScoreTable: React.FC<ScoreTableProps> = ({ game, singlePlayer, tournament, localPlayer, gameReport, strings, }) => {
    const players = game
        .getNonNeutralPlayers()
        .filter((player: any) => !player.isObserver || player.defeated)
        .sort((a: any, b: any) => b.score - a.score);
    const showReport = tournament && gameReport;
    const localPlayerReport = gameReport?.players.find((player: any) => player.name.toLowerCase() === localPlayer.name.toLowerCase());
    let resultType = localPlayerReport?.resultType;
    if (resultType === undefined) {
        if (game.stalemateDetectTrait?.isStale() &&
            game.stalemateDetectTrait.getCountdownTicks() === 0) {
            resultType = WolGameReportResult.Draw;
        }
        else if (localPlayer.defeated) {
            if (!game.alliances
                .getAllies(localPlayer)
                .filter((ally: any) => !ally.isAi && !ally.defeated).length) {
                resultType = WolGameReportResult.Loss;
            }
        }
        else if (!localPlayer.isObserver) {
            resultType = WolGameReportResult.Win;
        }
    }
    return React.createElement("div", { className: "score-wrapper" }, (resultType || !singlePlayer) &&
        React.createElement("div", { className: "score-title" }, React.createElement("div", { className: "game-result" }, resultType === WolGameReportResult.Win
            ? strings.get("gui:gameresultvictory")
            : resultType === WolGameReportResult.Draw
                ? strings.get("gui:gameresultdraw")
                : resultType === WolGameReportResult.Loss
                    ? strings.get("gui:gameresultdefeat")
                    : ""), !gameReport &&
            !singlePlayer &&
            (tournament || resultType === undefined) &&
            React.createElement("div", { className: "pending-results" }, strings.get("gui:gameresultwaiting")), localPlayerReport?.points &&
            React.createElement("div", { className: "points-gain" }, (localPlayerReport.points > 0 ? "+" : "") + localPlayerReport.points)), React.createElement("div", { className: "score-table-wrapper" }, React.createElement("table", { className: "score-table" }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", { className: "player-col" }, strings.get("GUI:Player")), React.createElement("th", { className: "country-col" }, strings.get("GUI:Country")), React.createElement("th", { className: "color-col" }, strings.get("GUI:Color")), React.createElement("th", { className: "score-col" }, strings.get("GUI:Score")), React.createElement("th", { className: "units-col" }, strings.get("GUI:Kills")), React.createElement("th", { className: "buildings-col" }, strings.get("GUI:Losses")), showReport && React.createElement("th", { className: "rank-col" }, "Rank"))), React.createElement("tbody", null, players.map((player: any) => {
        const isLocalPlayer = player === localPlayer;
        const playerReport = gameReport?.players.find((p: any) => p.name.toLowerCase() === player.name.toLowerCase());
        const rowColor = (typeof player.color === "string" ? player.color : player.color?.asHexString?.());
        return React.createElement("tr", {
            key: player.name,
            className: classnames({
                "local-player": isLocalPlayer,
                defeated: player.defeated,
            }),
            style: { color: rowColor },
        }, React.createElement("td", { className: "player-col" }, player.isAi
            ? strings.get(aiUiNames.get(player.aiDifficulty) || "GUI:AIDummy")
            : player.name), React.createElement("td", { className: "country-col" }, React.createElement(CountryIcon, { country: player.country })), React.createElement("td", { className: "color-col" }, React.createElement("div", {
            className: "color-indicator",
            style: {
                backgroundColor: (typeof player.color === "string" ? player.color : player.color?.asHexString?.()),
                width: 14,
                height: 14,
                border: "1px solid #000",
                borderRadius: 2,
            },
        })), React.createElement("td", { className: "score-col" }, player.score), React.createElement("td", { className: "units-col" }, player.getUnitsKilled ? player.getUnitsKilled() : player.unitsKilled), React.createElement("td", { className: "buildings-col" }, player.getUnitsLost ? player.getUnitsLost() : (player.unitsLost ?? player.buildingsKilled)), showReport &&
            React.createElement("td", { className: "rank-col" }, playerReport &&
                React.createElement(RankIndicator, {
                    playerProfile: {
                        name: player.name,
                        rankType: playerReport.rank,
                    },
                    strings: strings,
                })));
    })))));
};
