/**
 * Slot manager for multiplayer rooms.
 * Manages up to 8 player slots + 2 observer slots.
 */

import {
  SlotType,
  SlotData,
  PlayerState,
  MAX_PLAYERS,
  MAX_SLOTS,
} from '../src/network/multiplayer/protocol';
import { ClientConnection } from './ClientConnection';

export class SlotManager {
  private slots: SlotData[] = [];
  private maxPlayers: number;

  constructor(maxPlayers: number = MAX_PLAYERS) {
    this.maxPlayers = Math.min(maxPlayers, MAX_PLAYERS);
    this.initSlots();
  }

  private initSlots(): void {
    this.slots = [];
    // Player slots
    for (let i = 0; i < MAX_SLOTS; i++) {
      this.slots.push({
        index: i,
        type: i < this.maxPlayers ? SlotType.Open : SlotType.Closed,
        countryId: -1,
        colorId: -1,
        startPos: -1,
        teamId: -1,
        state: PlayerState.Connected,
        ping: 0,
        loadPercent: 0,
      });
    }
  }

  /** Find first open slot for a player. Returns slot index or -1. */
  findOpenSlot(): number {
    return this.slots.findIndex(
      s => s.type === SlotType.Open && s.index < this.maxPlayers
    );
  }

  /** Find first open observer slot. Returns slot index or -1. */
  findOpenObserverSlot(): number {
    return this.slots.findIndex(s => s.type === SlotType.OpenObserver);
  }

  /** Assign a player to a slot. */
  assignPlayer(slotIndex: number, conn: ClientConnection): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || (slot.type !== SlotType.Open && slot.type !== SlotType.OpenObserver)) {
      return false;
    }
    slot.type = SlotType.Player;
    slot.playerName = conn.playerName;
    slot.playerId = conn.id;
    slot.state = PlayerState.Connected;
    slot.ping = conn.ping;
    return true;
  }

  /** Remove a player from their slot, reverting to open. */
  removePlayer(connId: number): SlotData | undefined {
    const slot = this.slots.find(s => s.playerId === connId);
    if (slot) {
      const wasObserver = slot.index >= this.maxPlayers;
      slot.type = wasObserver ? SlotType.OpenObserver : SlotType.Open;
      slot.playerName = undefined;
      slot.playerId = undefined;
      slot.state = PlayerState.Connected;
      slot.countryId = -1;
      slot.colorId = -1;
      slot.startPos = -1;
      slot.teamId = -1;
      slot.ping = 0;
      slot.loadPercent = 0;
    }
    return slot;
  }

  /** Set AI in a slot. */
  setAi(slotIndex: number, difficulty: number = 0): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || slot.type === SlotType.Player) return false;
    slot.type = SlotType.Ai;
    slot.aiDifficulty = difficulty;
    slot.playerName = `AI ${slotIndex + 1}`;
    slot.playerId = undefined;
    return true;
  }

  /** Close an open slot. */
  closeSlot(slotIndex: number): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || slot.type === SlotType.Player) return false;
    slot.type = SlotType.Closed;
    return true;
  }

  /** Open a closed slot. */
  openSlot(slotIndex: number): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || slot.type !== SlotType.Closed) return false;
    slot.type = slotIndex >= this.maxPlayers ? SlotType.OpenObserver : SlotType.Open;
    return true;
  }

  /** Update player settings in a slot. */
  updateSlotSettings(slotIndex: number, settings: Partial<Pick<SlotData, 'countryId' | 'colorId' | 'startPos' | 'teamId'>>): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || (slot.type !== SlotType.Player && slot.type !== SlotType.Ai)) return false;
    if (settings.countryId !== undefined) slot.countryId = settings.countryId;
    if (settings.colorId !== undefined) slot.colorId = settings.colorId;
    if (settings.startPos !== undefined) slot.startPos = settings.startPos;
    if (settings.teamId !== undefined) slot.teamId = settings.teamId;
    return true;
  }

  /** Update a player's state. */
  updatePlayerState(connId: number, state: PlayerState): void {
    const slot = this.slots.find(s => s.playerId === connId);
    if (slot) slot.state = state;
  }

  /** Update a player's ping. */
  updatePlayerPing(connId: number, ping: number): void {
    const slot = this.slots.find(s => s.playerId === connId);
    if (slot) slot.ping = ping;
  }

  /** Update a player's load progress. */
  updateLoadPercent(connId: number, percent: number): void {
    const slot = this.slots.find(s => s.playerId === connId);
    if (slot) slot.loadPercent = percent;
  }

  /** Get slot by player connection ID. */
  getSlotByConnId(connId: number): SlotData | undefined {
    return this.slots.find(s => s.playerId === connId);
  }

  /** Get slot by player name. */
  getSlotByName(name: string): SlotData | undefined {
    return this.slots.find(s => s.playerName === name);
  }

  /** Get all active player slots (human players). */
  getPlayerSlots(): SlotData[] {
    return this.slots.filter(s => s.type === SlotType.Player);
  }

  /** Get all AI slots. */
  getAiSlots(): SlotData[] {
    return this.slots.filter(s => s.type === SlotType.Ai);
  }

  /** Get all occupied slots (players + AI). */
  getOccupiedSlots(): SlotData[] {
    return this.slots.filter(s => s.type === SlotType.Player || s.type === SlotType.Ai);
  }

  /** Get player count (human only). */
  getPlayerCount(): number {
    return this.getPlayerSlots().length;
  }

  /** Check if all human players are ready. */
  allPlayersReady(): boolean {
    const players = this.getPlayerSlots();
    return players.length > 0 && players.every(s => s.state === PlayerState.Ready);
  }

  /** Check if all human players have finished loading. */
  allPlayersLoaded(): boolean {
    const players = this.getPlayerSlots();
    return players.length > 0 && players.every(s => s.loadPercent >= 100);
  }

  /** Get serializable snapshot. */
  getSnapshot(): SlotData[] {
    return this.slots.map(s => ({ ...s }));
  }

  /** Get the player index (0-based) for game logic mapping. */
  getPlayerGameIndex(connId: number): number {
    const occupiedSlots = this.getOccupiedSlots().sort((a, b) => a.index - b.index);
    return occupiedSlots.findIndex(s => s.playerId === connId);
  }
}
