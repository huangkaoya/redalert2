import React from 'react';
import {
  SlotData,
  SlotType,
  PlayerState,
  RoomConfig,
} from '@/network/multiplayer/protocol';

export interface RoomLobbyProps {
  slots: SlotData[];
  config: RoomConfig;
  localPlayerId: number;
  hostId: number;
  chatMessages: { playerName: string; message: string }[];
  gameStarting: boolean;
  // Data lists
  countries: { id: number; name: string }[];
  colors: { id: number; hex: string }[];
  maxStartPos: number;
  maxTeams: number;
  // Callbacks
  onUpdateMySettings: (settings: { countryId?: number; colorId?: number; startPos?: number; teamId?: number }) => void;
  onSlotAction: (slotIndex: number, action: string, data?: any) => void;
  onUpdateConfig: (config: Partial<RoomConfig>) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSendChat: (message: string) => void;
  onToggleReady: () => void;
}

const slotTypeLabel: Record<number, string> = {
  [SlotType.Closed]: '关闭',
  [SlotType.Open]: '开放',
  [SlotType.OpenObserver]: '观察者',
  [SlotType.Player]: '玩家',
  [SlotType.Ai]: 'AI',
};

const aiDifficultyNames: Record<number, string> = {
  0: '冷酷',
  1: '中等',
  2: '简单',
};

const teamLabels = ['-', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const speedLabels: Record<number, string> = {
  0: '最慢',
  1: '较慢',
  2: '慢',
  3: '中等',
  4: '快',
  5: '较快',
  6: '最快',
};

export class RoomLobby extends React.Component<RoomLobbyProps> {
  render() {
    return (
      <div className="lobby-form lobby-form-mp">
        <div className="mp-lobby-layout">
          {this.renderPlayerSlots()}
          <div className="mp-lobby-controls">
            {this.renderGameOptions()}
            {this.renderActions()}
          </div>
          {this.renderChat()}
        </div>
      </div>
    );
  }

  private get isHost(): boolean {
    return this.props.localPlayerId >= 0 && this.props.localPlayerId === this.props.hostId;
  }

  private getMySlotIndex(): number {
    const slot = this.props.slots.find(s => s.playerId === this.props.localPlayerId);
    return slot?.index ?? -1;
  }

  private renderPlayerSlots() {
    const { slots, maxStartPos } = this.props;
    const visibleSlotCount = maxStartPos > 0 ? Math.min(maxStartPos, slots.length) : slots.length;
    const activeSlots = slots
      .slice(0, visibleSlotCount)
      .filter((slot) => slot.type !== SlotType.Closed || this.isHost);

    return (
      <div className="player-slots mp-player-slots-panel">
        <div className="mp-slot-row mp-slot-header">
          <div className="mp-col-status"></div>
          <div className="mp-col-name">玩家</div>
          <div className="mp-col-country">阵营</div>
          <div className="mp-col-color">颜色</div>
          <div className="mp-col-pos">位置</div>
          <div className="mp-col-team">队伍</div>
        </div>
        {activeSlots.map((slot) => this.renderSlotRow(slot))}
      </div>
    );
  }

  private renderSlotRow(slot: SlotData) {
    const mySlotIdx = this.getMySlotIndex();
    const isMySlot = slot.index === mySlotIdx;
    const canEdit = isMySlot || (this.isHost && slot.type === SlotType.Ai);
    const isOccupied = slot.type === SlotType.Player || slot.type === SlotType.Ai;

    return (
      <div className="mp-slot-row" key={'slot' + slot.index}>
        <div className="mp-col-status">
          {slot.playerId === this.props.hostId && <span title="房主" className="mp-host-icon">★</span>}
          {slot.type === SlotType.Player && slot.state === PlayerState.Ready && <span title="已准备" className="mp-ready-icon">★</span>}
        </div>
        <div className="mp-col-name">{this.renderSlotName(slot)}</div>
        <div className="mp-col-country">{isOccupied ? this.renderCountrySelect(slot, canEdit) : null}</div>
        <div className="mp-col-color">{isOccupied ? this.renderColorSelect(slot, canEdit) : null}</div>
        <div className="mp-col-pos">{isOccupied ? this.renderStartPosSelect(slot, canEdit) : null}</div>
        <div className="mp-col-team">{isOccupied ? this.renderTeamSelect(slot, canEdit) : null}</div>
      </div>
    );
  }

  private renderSlotName(slot: SlotData) {
    if (slot.type === SlotType.Player) {
      return (
        <input type="text" className="mp-slot-input" value={slot.playerName || ''} readOnly={true} />
      );
    }

    if (!this.isHost) {
      return (
        <input type="text" className="mp-slot-input"
          value={slotTypeLabel[slot.type] + (slot.type === SlotType.Ai ? ` (${aiDifficultyNames[slot.aiDifficulty ?? 2] || '简单'})` : '')}
          readOnly={true} />
      );
    }

    // Host can change slot type
    return (
      <select className="mp-slot-select"
        value={this.getSlotSelectValue(slot)}
        onChange={(e) => this.handleSlotSelect(slot.index, e.target.value)}>
        <option value="open">开放</option>
        <option value="closed">关闭</option>
        <option value="ai-0">AI - 冷酷</option>
        <option value="ai-1">AI - 中等</option>
        <option value="ai-2">AI - 简单</option>
      </select>
    );
  }

  private getSlotSelectValue(slot: SlotData): string {
    if (slot.type === SlotType.Player) return 'player';
    if (slot.type === SlotType.Ai) return `ai-${slot.aiDifficulty ?? 2}`;
    if (slot.type === SlotType.Closed) return 'closed';
    return 'open';
  }

  private handleSlotSelect(slotIndex: number, value: string) {
    if (value === 'open') {
      this.props.onSlotAction(slotIndex, 'open');
    } else if (value === 'closed') {
      this.props.onSlotAction(slotIndex, 'close');
    } else if (value.startsWith('ai-')) {
      const difficulty = parseInt(value.split('-')[1], 10);
      this.props.onSlotAction(slotIndex, 'ai', { difficulty });
    }
  }

  private renderCountrySelect(slot: SlotData, canEdit: boolean) {
    const { countries } = this.props;
    const val = slot.countryId < 0 ? -2 : slot.countryId;
    return (
      <select className="mp-slot-select" value={val}
        disabled={!canEdit}
        onChange={(e) => {
          const cid = parseInt(e.target.value, 10);
          if (slot.type === SlotType.Player) {
            this.props.onUpdateMySettings({ countryId: cid });
          } else if (this.isHost && slot.type === SlotType.Ai) {
            this.props.onSlotAction(slot.index, 'settings', { countryId: cid });
          }
        }}>
        <option value={-2}>随机</option>
        {countries.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    );
  }

  private renderColorSelect(slot: SlotData, canEdit: boolean) {
    const { colors, slots } = this.props;
    const val = slot.colorId < 0 ? -2 : slot.colorId;
    const usedColorIds = new Set(
      slots
        .filter(s => s.index !== slot.index && (s.type === SlotType.Player || s.type === SlotType.Ai) && s.colorId >= 0)
        .map(s => s.colorId)
    );
    return (
      <select className="mp-slot-select" value={val}
        disabled={!canEdit}
        onChange={(e) => {
          const cid = parseInt(e.target.value, 10);
          if (slot.type === SlotType.Player) {
            this.props.onUpdateMySettings({ colorId: cid });
          } else if (this.isHost && slot.type === SlotType.Ai) {
            this.props.onSlotAction(slot.index, 'settings', { colorId: cid });
          }
        }}>
        <option value={-2}>随机</option>
        {colors
          .filter(c => !usedColorIds.has(c.id) || c.id === slot.colorId)
          .map(c => (
            <option key={c.id} value={c.id} style={{ color: c.hex }}>■ {c.hex}</option>
          ))}
      </select>
    );
  }

  private renderStartPosSelect(slot: SlotData, canEdit: boolean) {
    const { maxStartPos, slots } = this.props;
    const positions = Array.from({ length: maxStartPos }, (_, i) => i);
    const val = slot.startPos < 0 ? -2 : slot.startPos;
    const usedPositions = new Set(
      slots
        .filter(s => s.index !== slot.index && (s.type === SlotType.Player || s.type === SlotType.Ai) && s.startPos >= 0)
        .map(s => s.startPos)
    );
    return (
      <select className="mp-slot-select" value={val}
        disabled={!canEdit}
        onChange={(e) => {
          const pos = parseInt(e.target.value, 10);
          if (slot.type === SlotType.Player) {
            this.props.onUpdateMySettings({ startPos: pos });
          } else if (this.isHost && slot.type === SlotType.Ai) {
            this.props.onSlotAction(slot.index, 'settings', { startPos: pos });
          }
        }}>
        <option value={-2}>随机</option>
        {positions
          .filter(p => !usedPositions.has(p) || p === slot.startPos)
          .map(p => (
            <option key={p} value={p}>{p + 1}</option>
          ))}
      </select>
    );
  }

  private renderTeamSelect(slot: SlotData, canEdit: boolean) {
    const { maxTeams } = this.props;
    const teams = Array.from({ length: maxTeams }, (_, i) => i);
    const val = slot.teamId < 0 ? -2 : slot.teamId;
    return (
      <select className="mp-slot-select" value={val}
        disabled={!canEdit}
        onChange={(e) => {
          const tid = parseInt(e.target.value, 10);
          if (slot.type === SlotType.Player) {
            this.props.onUpdateMySettings({ teamId: tid });
          } else if (this.isHost && slot.type === SlotType.Ai) {
            this.props.onSlotAction(slot.index, 'settings', { teamId: tid });
          }
        }}>
        <option value={-2}>-</option>
        {teams.map(t => (
          <option key={t} value={t}>{teamLabels[t + 1] || (t + 1)}</option>
        ))}
      </select>
    );
  }

  private renderGameOptions() {
    const { config } = this.props;
    const disabled = !this.isHost;

    return (
      <div className="game-options mp-game-options-panel">
        <div className="game-options-left">
          {this.renderCheckbox('短游戏', config.shortGame, disabled, (v) => this.props.onUpdateConfig({ shortGame: v }), 'mp-option-item')}
          {this.renderCheckbox('MCV重新打包', config.mcvRepacks, disabled, (v) => this.props.onUpdateConfig({ mcvRepacks: v }), 'mp-option-item')}
          {this.renderCheckbox('出现箱子', config.cratesAppear, disabled, (v) => this.props.onUpdateConfig({ cratesAppear: v }), 'mp-option-item')}
          {this.renderCheckbox('超级武器', config.superWeapons, disabled, (v) => this.props.onUpdateConfig({ superWeapons: v }), 'mp-option-item')}
          {this.renderCheckbox('可破坏桥梁', config.destroyableBridges, disabled, (v) => this.props.onUpdateConfig({ destroyableBridges: v }), 'mp-option-item')}
          {this.renderCheckbox('多位工程师', config.multiEngineer, disabled, (v) => this.props.onUpdateConfig({ multiEngineer: v }), 'mp-option-item')}
          {this.renderCheckbox('狗不杀工程师', config.noDogEngiKills, disabled, (v) => this.props.onUpdateConfig({ noDogEngiKills: v }), 'mp-option-item')}
        </div>
        <div className={'game-options-right' + (disabled ? ' all-disabled' : '')}>
          <div className="slider-item">
            <span className="label">游戏速度</span>
            <select value={config.gameSpeed} disabled={disabled}
              onChange={(e) => this.props.onUpdateConfig({ gameSpeed: parseInt(e.target.value, 10) })}>
              {[0, 1, 2, 3, 4, 5, 6].map(s => (
                <option key={s} value={s}>{speedLabels[s]}</option>
              ))}
            </select>
          </div>
          <div className="slider-item">
            <span className="label">初始资金</span>
            <select value={config.credits} disabled={disabled}
              onChange={(e) => this.props.onUpdateConfig({ credits: parseInt(e.target.value, 10) })}>
              {[5000, 7500, 10000, 15000, 20000, 25000, 30000, 50000].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="slider-item">
            <span className="label">部队数</span>
            <select value={config.unitCount} disabled={disabled}
              onChange={(e) => this.props.onUpdateConfig({ unitCount: parseInt(e.target.value, 10) })}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          {this.renderCheckbox('在盟友旁建造', config.buildOffAlly, disabled, (v) => this.props.onUpdateConfig({ buildOffAlly: v }), 'checkbox-item mp-right-checkbox')}
        </div>
      </div>
    );
  }

  private renderCheckbox(label: string, checked: boolean, disabled: boolean, onChange: (v: boolean) => void, className: string = '') {
    return (
      <div className={className}>
        <label>
          <input type="checkbox" checked={checked} disabled={disabled}
            onChange={(e) => onChange(e.target.checked)} />{' '}
          <span>{label}</span>
        </label>
      </div>
    );
  }

  private renderChat() {
    const { chatMessages } = this.props;
    return (
      <div className="mp-chat">
        <div className="mp-chat-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} className="mp-chat-line">
              <span className="mp-chat-name">{msg.playerName}: </span>
              <span>{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="mp-chat-input">
          <input type="text" placeholder="输入消息..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                if (input.value.trim()) {
                  this.props.onSendChat(input.value.trim());
                  input.value = '';
                }
              }
            }} />
        </div>
      </div>
    );
  }

  private renderActions() {
    const mySlotIdx = this.getMySlotIndex();
    const mySlot = mySlotIdx >= 0 ? this.props.slots.find(s => s.index === mySlotIdx) : undefined;
    const isReady = mySlot?.state === PlayerState.Ready;
    const { gameStarting } = this.props;

    return (
      <div className="mp-lobby-actions">
        {this.isHost ? (
          <button className="dialog-button" disabled={gameStarting} onClick={this.props.onStartGame}>
            {gameStarting ? '正在启动...' : '开始游戏'}
          </button>
        ) : (
          <button className="dialog-button" onClick={this.props.onToggleReady}>
            {isReady ? '取消准备' : '准备'}
          </button>
        )}
        <button className="dialog-button" onClick={this.props.onLeaveRoom}>
          离开房间
        </button>
      </div>
    );
  }
}
