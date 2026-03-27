import React from "react";
import classnames from "classnames";
import { LobbyType, SlotOccupation, SlotType, PlayerStatus, } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { Slider } from "@/gui/component/Slider";
import { Chat } from "@/gui/component/Chat";
import { CountrySelect } from "@/gui/component/CountrySelect";
import { ColorSelect } from "@/gui/component/ColorSelect";
import { PingIndicator } from "@/gui/component/PingIndicator";
import { AiDifficulty } from "@/game/gameopts/GameOpts";
import { Image } from "@/gui/component/Image";
import { StartPosSelect } from "@/gui/component/StartPosSelect";
import { TeamSelect } from "@/gui/component/TeamSelect";
import { NO_TEAM_ID, OBS_TEAM_ID, OBS_COUNTRY_NAME, aiUiTooltips } from "@/game/gameopts/constants";
import { Select } from "@/gui/component/Select";
import { Option } from "@/gui/component/Option";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { RankIndicator } from "@/gui/screen/mainMenu/lobby/component/RankIndicator";
interface LobbyFormProps {
    strings: any;
    lobbyType: LobbyType;
    mpDialogSettings: any;
    selectedGameServer?: string;
    playerSlots: any[];
    shortGame: boolean;
    mcvRepacks: boolean;
    cratesAppear: boolean;
    superWeapons: boolean;
    hostTeams?: boolean;
    destroyableBridges: boolean;
    multiEngineer: boolean;
    multiEngineerCount?: number;
    noDogEngiKills: boolean;
    gameSpeed: number;
    credits: number;
    unitCount: number;
    buildOffAlly: boolean;
    messages?: any[];
    localUsername?: string;
    channels?: any[];
    chatHistory?: any;
    activeSlotIndex: number;
    countryUiNames: any;
    countryUiTooltips: any;
    availablePlayerCountries: any;
    availablePlayerColors: any;
    availableStartPositions: any;
    teamsAllowed: boolean;
    teamsRequired: boolean;
    maxTeams: number;
    availableAiNames: any;
    onSlotChange: (occupation: number, slotIndex: number, aiDifficulty?: any) => void;
    onToggleShortGame: (checked: boolean) => void;
    onToggleMcvRepacks: (checked: boolean) => void;
    onToggleCratesAppear: (checked: boolean) => void;
    onToggleSuperWeapons: (checked: boolean) => void;
    onToggleHostTeams?: (checked: boolean) => void;
    onToggleDestroyableBridges?: (checked: boolean) => void;
    onToggleMultiEngineer?: (checked: boolean) => void;
    onToggleNoDogEngiKills?: (checked: boolean) => void;
    onChangeGameSpeed: (value: number) => void;
    onChangeCredits: (value: number) => void;
    onChangeUnitCount: (value: number) => void;
    onToggleBuildOffAlly: (checked: boolean) => void;
    onSendMessage?: (message: string) => void;
    onCountrySelect: (country: any, slotIndex: number) => void;
    onColorSelect: (color: any, slotIndex: number) => void;
    onStartPosSelect: (pos: any, slotIndex: number) => void;
    onTeamSelect: (team: any, slotIndex: number) => void;
}
export class LobbyForm extends React.Component<LobbyFormProps> {
    private getFirstAvailableAiDifficulty(): AiDifficulty {
        const iterator = this.props.availableAiNames.keys();
        const first = iterator.next();
        return first.done ? AiDifficulty.Easy : first.value;
    }
    onPlayerSelect = (value: string, slotIndex: number) => {
        let occupation: number;
        let aiDifficulty: any;
        if (value.match(/^\d+$/)) {
            occupation = Number(value);
        }
        else {
            occupation = SlotOccupation.Occupied;
            aiDifficulty = AiDifficulty[value as keyof typeof AiDifficulty];
            if (aiDifficulty === undefined ||
                !this.props.availableAiNames.has(aiDifficulty)) {
                aiDifficulty = this.getFirstAvailableAiDifficulty();
            }
        }
        this.props.onSlotChange(occupation, slotIndex, aiDifficulty);
    };
    render() {
        const { strings, lobbyType, mpDialogSettings } = this.props;
        const isHost = lobbyType === LobbyType.Singleplayer ||
            lobbyType === LobbyType.MultiplayerHost;
        const isSingleplayer = lobbyType === LobbyType.Singleplayer;
        const props = this.props;
        return (<div className={classnames("lobby-form", {
                "lobby-form-sp": isSingleplayer,
                "lobby-form-server-sel": props.selectedGameServer,
            })}>
        {props.selectedGameServer && (<div className="game-server">
            <span className="label">{strings.get("TS:ServerLabel")}</span>
            <Select initialValue={props.selectedGameServer} disabled={true}>
              <Option label={props.selectedGameServer} value={props.selectedGameServer}/>
            </Select>
          </div>)}
        
        <div className="player-slots">
          <div className="player-slot player-slot-header">
            <div className="player-header-players">
              {strings.get("GUI:Players")}
            </div>
            <div className="player-header-side">
              {strings.get("GUI:Side")}
            </div>
            <div className="player-header-color">
              {strings.get("GUI:Color")}
            </div>
            <div className="player-header-position">
              {strings.get("GUI:StartPosition")}
            </div>
            <div className="player-header-team">
              {strings.get("GUI:Team")}
            </div>
          </div>
          {props.playerSlots.map((slot, index) => this.renderPlayerSlot(props, slot, index))}
        </div>

        <div className="game-options">
          <div className="game-options-left">
            <div data-r-tooltip={strings.get("STT:HostCBoxShortGame")}>
              <label>
                <input type="checkbox" name="shortGame" checked={props.shortGame} onChange={(e) => this.props.onToggleShortGame(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:ShortGame")}</span>
              </label>
            </div>
            <div data-r-tooltip={strings.get("STT:HostCBoxRedeploys")}>
              <label>
                <input type="checkbox" name="mcvRepacks" checked={props.mcvRepacks} onChange={(e) => this.props.onToggleMcvRepacks(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:MCVRepacks")}</span>
              </label>
            </div>
            <div data-r-tooltip={strings.get("STT:HostCBoxCrates")}>
              <label>
                <input type="checkbox" name="cratesAppear" checked={props.cratesAppear} onChange={(e) => this.props.onToggleCratesAppear(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:CratesAppear")}</span>
              </label>
            </div>
            <div data-r-tooltip={strings.get("STT:HostCBoxSWAllowed")}>
              <label>
                <input type="checkbox" name="superWeapons" checked={props.superWeapons} onChange={(e) => this.props.onToggleSuperWeapons(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:SuperWeaponsAllowed")}</span>
              </label>
            </div>
            {props.lobbyType !== LobbyType.Singleplayer && props.hostTeams !== undefined && (<div data-r-tooltip={strings.get("STT:HostCBoxHostTeams")}>
                <label>
                  <input type="checkbox" name="hostTeams" checked={props.hostTeams} onChange={(e) => this.props.onToggleHostTeams?.(e.target.checked)} disabled={!isHost}/>{" "}
                  <span>{strings.get("GUI:HostTeams")}</span>
                </label>
              </div>)}
            <div data-r-tooltip={strings.get("STT:DestroyableBridges")}>
              <label>
                <input type="checkbox" name="destBridges" checked={props.destroyableBridges} onChange={(e) => this.props.onToggleDestroyableBridges?.(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:DestroyableBridges")}</span>
              </label>
            </div>
            <div data-r-tooltip={strings.get("STT:MultiEngineer", props.multiEngineerCount)}>
              <label>
                <input type="checkbox" name="multiEngineer" checked={props.multiEngineer} onChange={(e) => this.props.onToggleMultiEngineer?.(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:MultiEngineer")}</span>
              </label>
            </div>
            <div data-r-tooltip={strings.get("STT:NoDogEngiKills")}>
              <label>
                <input type="checkbox" name="noDogEngiKills" checked={props.noDogEngiKills} onChange={(e) => this.props.onToggleNoDogEngiKills?.(e.target.checked)} disabled={!isHost}/>{" "}
                <span>{strings.get("GUI:NoDogEngiKills")}</span>
              </label>
            </div>
          </div>
          
          <div className={"game-options-right" + (isHost ? "" : " all-disabled")}>
            <div className="slider-item">
              <span className="label">{strings.get("GUI:GameSpeed")}</span>
              <Slider name="gameSpeed" min={0} max={6} value={"" + props.gameSpeed} disabled={!isHost} data-r-tooltip={strings.get("STT:HostSliderSpeed")} onChange={(e) => this.props.onChangeGameSpeed(Number(e.target.value))}/>
            </div>
            <div className="slider-item">
              <span className="label">{strings.get("GUI:Credits")}</span>
              <Slider name="credits" min={mpDialogSettings.minMoney} max={mpDialogSettings.maxMoney} step={mpDialogSettings.moneyIncrement} value={"" + props.credits} data-r-tooltip={strings.get("STT:HostSliderCredits")} onChange={(e) => this.props.onChangeCredits(Number(e.target.value))} disabled={!isHost}/>
            </div>
            <div className="slider-item">
              <span className="label">{strings.get("GUI:UnitCount")}</span>
              <Slider name="unitCount" min={mpDialogSettings.minUnitCount} max={mpDialogSettings.maxUnitCount} value={"" + props.unitCount} data-r-tooltip={strings.get("STT:HostSliderUnit")} onChange={(e) => this.props.onChangeUnitCount(Number(e.target.value))} disabled={!isHost}/>
            </div>
            <div className="checkbox-item" data-r-tooltip={strings.get("STT:HostCBoxBuildOffAlly")}>
              <label>
                <input type="checkbox" name="buildOffAlly" checked={props.buildOffAlly} disabled={!isHost} onChange={(e) => this.props.onToggleBuildOffAlly(e.target.checked)}/>{" "}
                <span>{strings.get("GUI:BuildOffAlly")}</span>
              </label>
            </div>
          </div>
        </div>

        {this.props.messages !== undefined &&
                this.props.localUsername !== undefined &&
                this.props.onSendMessage && (<Chat messages={this.props.messages} localUsername={this.props.localUsername} channels={this.props.channels ?? []} chatHistory={this.props.chatHistory} onSendMessage={this.props.onSendMessage} onCancelMessage={() => { }} tooltips={{
                    button: strings.get("STT:EmoteButton"),
                    input: isHost
                        ? strings.get("STT:HostEditInput")
                        : strings.get("STT:GuestEditInput"),
                    output: isHost
                        ? strings.get("STT:HostEditOutput")
                        : strings.get("STT:GuestEditOutput"),
                }} strings={strings}/>)}
      </div>);
    }
    renderPlayerSlot(props: LobbyFormProps, slot: any, index: number) {
        const strings = props.strings;
        const isHost = props.lobbyType === LobbyType.Singleplayer ||
            props.lobbyType === LobbyType.MultiplayerHost;
        return slot ? (<div className="player-slot" key={"playerslot" + index}>
        {slot.type === SlotType.Player ? (<RankIndicator playerProfile={slot.playerProfile} strings={strings}/>) : (<RankIndicator playerProfile={undefined} strings={strings}/>)}
        <PingIndicator ping={slot.type === SlotType.Player ? slot.ping : undefined} strings={strings}/>
        <div className="player-status" data-r-tooltip={strings.get("STT:HostPictureAcceptance")}>
          {this.renderPlayerStatus(slot.status)}
        </div>
        {this.renderPlayerSelect(slot, index, props.lobbyType)}
        <CountrySelect countryUiNames={props.countryUiNames} countryUiTooltips={props.countryUiTooltips} country={slot.country} availableCountries={props.availablePlayerCountries} disabled={(index !== props.activeSlotIndex &&
                (!isHost || slot.type !== SlotType.Ai)) ||
                slot.type === SlotType.Observer ||
                (slot.status === PlayerStatus.Ready &&
                    slot.type !== SlotType.Ai)} strings={props.strings} onSelect={(country) => this.props.onCountrySelect(country, index)}/>
        {slot.type !== SlotType.Observer ? (<>
            <ColorSelect color={slot.color} availableColors={props.availablePlayerColors} disabled={(index !== props.activeSlotIndex &&
                    (!isHost || slot.type !== SlotType.Ai)) ||
                    (slot.status === PlayerStatus.Ready &&
                        slot.type !== SlotType.Ai)} strings={props.strings} onSelect={(color) => this.props.onColorSelect(color, index)}/>
            <StartPosSelect disabled={props.hostTeams
                    ? !isHost || slot.occupation !== SlotOccupation.Occupied
                    : (index !== props.activeSlotIndex &&
                        (!isHost || slot.type !== SlotType.Ai)) ||
                        (slot.status === PlayerStatus.Ready &&
                            slot.type !== SlotType.Ai)} startPos={slot.startPos} availableStartPositions={props.availableStartPositions} onSelect={(pos) => this.props.onStartPosSelect(pos, index)} strings={props.strings}/>
          </>) : null}
            <TeamSelect disabled={!props.teamsAllowed ||
                    (props.hostTeams
                        ? !isHost || slot.occupation !== SlotOccupation.Occupied
                        : (index !== props.activeSlotIndex &&
                            (!isHost || slot.type !== SlotType.Ai)) ||
                            (slot.status === PlayerStatus.Ready &&
                                slot.type !== SlotType.Ai))} teamId={slot.type === SlotType.Observer || slot.country === OBS_COUNTRY_NAME ? OBS_TEAM_ID : (props.teamsAllowed ? slot.team : NO_TEAM_ID)} required={props.teamsRequired} maxTeams={props.maxTeams} showObserver={index === props.activeSlotIndex} onSelect={(team) => this.props.onTeamSelect(team, index)} strings={props.strings}/>
      </div>) : (<div className="player-slot" key={"playerslot" + index}/>);
    }
    renderPlayerStatus(status: any) {
        return status === PlayerStatus.Host ? (<Image src="wolhost.pcx"/>) : status === PlayerStatus.Ready ? (<Image src="wolacpt.pcx"/>) : null;
    }
    renderPlayerSelect(slot: any, index: number, lobbyType: LobbyType) {
        const isSingleplayer = lobbyType === LobbyType.Singleplayer;
        const isHost = isSingleplayer || lobbyType === LobbyType.MultiplayerHost;
        if (index === this.props.activeSlotIndex || (isHost && index === 0)) {
            return (<input type="text" className="player-name" value={slot.name} readOnly={true}/>);
        }
        const strings = this.props.strings;
        const displayOccupation = isSingleplayer && slot.occupation === SlotOccupation.Open
            ? SlotOccupation.Closed
            : slot.occupation;
        const optionsMap = new Map()
            .set(SlotOccupation.Occupied, slot.name || "")
            .set(SlotOccupation.Open, strings.get(slot.type === SlotType.Observer
            ? "GUI:OpenObserver"
            : "GUI:Open"))
            .set(SlotOccupation.Closed, isSingleplayer ? strings.get("GUI:None") : strings.get("GUI:Closed"));
        let selectedValue = displayOccupation;
        if (displayOccupation === SlotOccupation.Occupied &&
            slot.type === SlotType.Ai) {
            optionsMap.delete(SlotOccupation.Occupied);
            const selectedDifficulty = this.props.availableAiNames.has(slot.aiDifficulty)
                ? slot.aiDifficulty
                : this.getFirstAvailableAiDifficulty();
            selectedValue = AiDifficulty[selectedDifficulty];
        }
        if (slot.type !== SlotType.Observer) {
            this.props.availableAiNames.forEach((name: string, difficulty: number) => {
                optionsMap.set(AiDifficulty[difficulty], strings.get(name));
            });
        }
        return (<Select initialValue={"" + selectedValue} disabled={!isHost} onSelect={(value) => this.onPlayerSelect(value, index)} className="player-name" tooltip={isSingleplayer
                ? strings.get("STT:SkirmishComboAiPlayer")
                : strings.get("STT:HostComboPlayer")}>
        {[...optionsMap]
                .map(([value, label]) => (value === SlotOccupation.Occupied &&
                slot.occupation !== SlotOccupation.Occupied) ||
                (value === SlotOccupation.Open && isSingleplayer)
                ? null
                : (<Option key={value} value={"" + value} label={label} tooltip={isSingleplayer
                        ? (() => {
                            let tooltipKey: string | undefined;
                            if (value === SlotOccupation.Closed) {
                                tooltipKey = "STT:PlayerNone";
                            }
                            else {
                                tooltipKey = aiUiTooltips.get(AiDifficulty[value as keyof typeof AiDifficulty] as AiDifficulty);
                            }
                            return tooltipKey ? strings.get(tooltipKey) : undefined;
                        })()
                        : undefined}/>))
                .filter(isNotNullOrUndefined)}
      </Select>);
    }
}
