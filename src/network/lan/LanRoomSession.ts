import { VirtualFile } from '@/data/vfs/VirtualFile';
import { MapDigest } from '@/engine/MapDigest';
import { GameOpts } from '@/game/gameopts/GameOpts';
import { NO_TEAM_ID, OBS_COUNTRY_ID, RANDOM_COLOR_ID, RANDOM_COUNTRY_ID, RANDOM_START_POS } from '@/game/gameopts/constants';
import { SlotInfo, SlotType as NetSlotType } from '@/network/gameopt/SlotInfo';
import { LanPeerIdentity } from '@/network/lan/LanQrPayload';
import { LanMeshAppMessage, LanMeshSession, LanMeshSnapshot } from '@/network/lan/LanMeshSession';
import { EventDispatcher } from '@/util/event';
import { base64StringToUint8Array, uint8ArrayToBase64String } from '@/util/string';

interface GameMode {
    id: number;
    mpDialogSettings: any;
}

interface GameModes {
    getById(id: number): GameMode;
}

interface MapDirectory {
    containsEntry(entryName: string): Promise<boolean>;
    writeFile(file: VirtualFile): Promise<void>;
}

interface MapList {
    addFromMapFile(file: VirtualFile): void;
}

interface MapFileLoader {
    load(mapName: string): Promise<any>;
}

export interface LanHumanAssignment {
    peerId: string;
    slotIndex: number;
    name: string;
}

export interface LanMapTransferPeerState {
    status: 'idle' | 'pending' | 'sending' | 'receiving' | 'complete' | 'error';
    receivedBytes?: number;
    totalBytes?: number;
    error?: string;
    updatedAt: number;
}

export interface LanRoomState {
    version: 1;
    hostPeerId: string;
    memberOrder: string[];
    humanAssignments: LanHumanAssignment[];
    gameOpts: GameOpts;
    slotsInfo: SlotInfo[];
    readyStateByPeerId: Record<string, boolean>;
    mapTransferStateByPeerId: Record<string, LanMapTransferPeerState>;
}

export interface LanLaunchDescriptor {
    kind: 'lan';
    roomId: string;
    gameId: string;
    timestamp: number;
    hostPeerId: string;
    localPeerId: string;
    localPlayerName: string;
    gameOpts: GameOpts;
    humanAssignments: LanHumanAssignment[];
    mapTransferStateByPeerId: Record<string, LanMapTransferPeerState>;
    returnRoute: {
        screenType: number;
        params?: any;
    };
}

export interface LanRoomMemberSnapshot {
    peerId: string;
    name: string;
    isSelf: boolean;
    isHost: boolean;
    isConnected: boolean;
    slotIndex?: number;
    ready: boolean;
    mapTransfer: LanMapTransferPeerState;
}

export interface LanRoomSnapshot {
    self: LanPeerIdentity;
    mesh: LanMeshSnapshot;
    isRoomActive: boolean;
    isHost: boolean;
    hostPeerId?: string;
    roomState?: LanRoomState;
    members: LanRoomMemberSnapshot[];
    localMapFileReady: boolean;
    canInvite: boolean;
    canStart: boolean;
    launchDescriptor?: LanLaunchDescriptor;
}

type LanRoomMessage =
    | {
        type: 'state-sync';
        state: LanRoomState;
    }
    | {
        type: 'slot-request';
        peerId: string;
        slotIndex: number;
        countryId: number;
        colorId: number;
        startPos: number;
        teamId: number;
    }
    | {
        type: 'ready';
        peerId: string;
        ready: boolean;
    }
    | {
        type: 'map-offer';
        peerId: string;
        filename: string;
        digest: string;
        sizeBytes: number;
        totalChunks: number;
    }
    | {
        type: 'map-chunk';
        peerId: string;
        digest: string;
        index: number;
        totalChunks: number;
        data: string;
    }
    | {
        type: 'map-complete';
        peerId: string;
        digest: string;
        ok: boolean;
        error?: string;
    }
    | {
        type: 'start-game';
        descriptor: LanLaunchDescriptor;
    }
    | {
        type: 'host-handover';
        hostPeerId: string;
    };

interface IncomingMapTransfer {
    filename: string;
    digest: string;
    totalChunks: number;
    sizeBytes: number;
    chunks: string[];
}

const MAP_CHUNK_SIZE = 12 * 1024;

function cloneHumanPlayer(player: any) {
    return {
        name: player.name,
        countryId: player.countryId,
        colorId: player.colorId,
        startPos: player.startPos,
        teamId: player.teamId,
    };
}

function cloneAiPlayer(ai: any) {
    return ai
        ? {
            difficulty: ai.difficulty,
            countryId: ai.countryId,
            colorId: ai.colorId,
            startPos: ai.startPos,
            teamId: ai.teamId,
        }
        : undefined;
}

function cloneGameOpts(gameOpts: GameOpts): GameOpts {
    return {
        gameMode: gameOpts.gameMode,
        gameSpeed: gameOpts.gameSpeed,
        credits: gameOpts.credits,
        unitCount: gameOpts.unitCount,
        shortGame: gameOpts.shortGame,
        superWeapons: gameOpts.superWeapons,
        buildOffAlly: gameOpts.buildOffAlly,
        mcvRepacks: gameOpts.mcvRepacks,
        cratesAppear: gameOpts.cratesAppear,
        hostTeams: gameOpts.hostTeams,
        destroyableBridges: gameOpts.destroyableBridges,
        multiEngineer: gameOpts.multiEngineer,
        noDogEngiKills: gameOpts.noDogEngiKills,
        mapName: gameOpts.mapName,
        mapTitle: gameOpts.mapTitle,
        mapDigest: gameOpts.mapDigest,
        mapSizeBytes: gameOpts.mapSizeBytes,
        maxSlots: gameOpts.maxSlots,
        mapOfficial: gameOpts.mapOfficial,
        humanPlayers: gameOpts.humanPlayers.map(cloneHumanPlayer),
        aiPlayers: gameOpts.aiPlayers.map(cloneAiPlayer),
        unknown: gameOpts.unknown,
    };
}

function cloneSlotsInfo(slotsInfo: SlotInfo[]): SlotInfo[] {
    return slotsInfo.map((slot) => ({
        type: slot.type,
        name: slot.name,
        difficulty: slot.difficulty,
    }));
}

function cloneMapTransferState(state: Record<string, LanMapTransferPeerState>): Record<string, LanMapTransferPeerState> {
    const cloned: Record<string, LanMapTransferPeerState> = {};
    Object.entries(state).forEach(([peerId, value]) => {
        cloned[peerId] = { ...value };
    });
    return cloned;
}

function cloneRoomState(state: LanRoomState): LanRoomState {
    return {
        version: 1,
        hostPeerId: state.hostPeerId,
        memberOrder: [...state.memberOrder],
        humanAssignments: state.humanAssignments.map((assignment) => ({ ...assignment })),
        gameOpts: cloneGameOpts(state.gameOpts),
        slotsInfo: cloneSlotsInfo(state.slotsInfo),
        readyStateByPeerId: { ...state.readyStateByPeerId },
        mapTransferStateByPeerId: cloneMapTransferState(state.mapTransferStateByPeerId),
    };
}

function createTransferState(status: LanMapTransferPeerState['status'], totalBytes?: number, receivedBytes?: number, error?: string): LanMapTransferPeerState {
    return {
        status,
        totalBytes,
        receivedBytes,
        error,
        updatedAt: Date.now(),
    };
}

function getTransferStatePriority(status: LanMapTransferPeerState['status']): number {
    switch (status) {
        case 'idle':
            return 0;
        case 'pending':
            return 1;
        case 'sending':
            return 1;
        case 'receiving':
            return 2;
        case 'error':
            return 3;
        case 'complete':
            return 4;
        default:
            return 0;
    }
}

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createDefaultHumanPlayer(name: string, mustAlly: boolean) {
    return {
        name,
        countryId: RANDOM_COUNTRY_ID,
        colorId: RANDOM_COLOR_ID,
        startPos: RANDOM_START_POS,
        teamId: mustAlly ? 0 : NO_TEAM_ID,
    };
}

export class LanRoomSession {
    private roomState?: LanRoomState;
    private currentCustomMapFile?: VirtualFile;
    private incomingTransfers = new Map<string, IncomingMapTransfer>();
    private lastMeshSnapshot: LanMeshSnapshot;
    private launchDescriptor?: LanLaunchDescriptor;
    private disposed = false;

    public readonly onSnapshotChange = new EventDispatcher<this, LanRoomSnapshot>();
    public readonly onLog = new EventDispatcher<this, { level: 'info' | 'warn' | 'error'; text: string; timestamp: number }>();
    public readonly onLaunch = new EventDispatcher<this, LanLaunchDescriptor>();

    constructor(
        private readonly meshSession: LanMeshSession,
        private readonly gameModes: GameModes,
        private readonly mapFileLoader: MapFileLoader,
        private readonly mapDir?: MapDirectory,
        private readonly mapList?: MapList
    ) {
        this.lastMeshSnapshot = meshSession.getSnapshot();
        this.handleMeshSnapshot = this.handleMeshSnapshot.bind(this);
        this.handleAppMessage = this.handleAppMessage.bind(this);
        this.meshSession.onSnapshotChange.subscribe(this.handleMeshSnapshot);
        this.meshSession.onAppMessage.subscribe(this.handleAppMessage);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.meshSession.onSnapshotChange.unsubscribe(this.handleMeshSnapshot);
        this.meshSession.onAppMessage.unsubscribe(this.handleAppMessage);
    }

    getSnapshot(): LanRoomSnapshot {
        return this.createSnapshot();
    }

    getResolvedCustomMapFile(): VirtualFile | undefined {
        return this.currentCustomMapFile;
    }

    startHosting(snapshot: { gameOpts: GameOpts; slotsInfo: SlotInfo[]; currentMapFile?: any }): void {
        const meshSnapshot = this.meshSession.ensureLocalRoom();
        this.lastMeshSnapshot = meshSnapshot;
        const self = meshSnapshot.self;
        const state: LanRoomState = {
            version: 1,
            hostPeerId: self.id,
            memberOrder: [self.id],
            humanAssignments: [{ peerId: self.id, slotIndex: 0, name: self.name }],
            gameOpts: cloneGameOpts(snapshot.gameOpts),
            slotsInfo: cloneSlotsInfo(snapshot.slotsInfo),
            readyStateByPeerId: { [self.id]: false },
            mapTransferStateByPeerId: {
                [self.id]: snapshot.gameOpts.mapOfficial
                    ? createTransferState('complete', snapshot.gameOpts.mapSizeBytes, snapshot.gameOpts.mapSizeBytes)
                    : createTransferState('complete', snapshot.gameOpts.mapSizeBytes, snapshot.gameOpts.mapSizeBytes),
            },
        };
        this.currentCustomMapFile = snapshot.gameOpts.mapOfficial || !snapshot.currentMapFile
            ? undefined
            : VirtualFile.fromBytes(snapshot.currentMapFile.getBytes(), snapshot.gameOpts.mapName);
        this.roomState = state;
        this.reconcileRoomStateWithMesh();
        this.broadcastStateSync();
        this.dispatchSnapshot();
    }

    applyHostPregameSnapshot(snapshot: { gameOpts: GameOpts; slotsInfo: SlotInfo[]; currentMapFile?: any }): void {
        if (!this.roomState || !this.isHost()) {
            return;
        }
        this.roomState.gameOpts = cloneGameOpts(snapshot.gameOpts);
        this.roomState.slotsInfo = cloneSlotsInfo(snapshot.slotsInfo);
        this.currentCustomMapFile = snapshot.gameOpts.mapOfficial || !snapshot.currentMapFile
            ? undefined
            : VirtualFile.fromBytes(snapshot.currentMapFile.getBytes(), snapshot.gameOpts.mapName);
        this.reconcileRoomStateWithMesh();
        this.broadcastStateSync();
        this.scheduleCustomMapTransfers();
        this.dispatchSnapshot();
    }

    async setReady(ready: boolean): Promise<void> {
        const self = this.meshSession.getSelf();
        if (!this.roomState) {
            return;
        }
        if (this.isHost()) {
            this.roomState.readyStateByPeerId[self.id] = ready;
            this.broadcastStateSync();
            this.dispatchSnapshot();
            return;
        }
        this.meshSession.sendAppMessage(this.roomState.hostPeerId, {
            type: 'ready',
            peerId: self.id,
            ready,
        } satisfies LanRoomMessage);
    }

    async requestSlotConfig(slotIndex: number, config: { countryId: number; colorId: number; startPos: number; teamId: number }): Promise<void> {
        if (!this.roomState || this.isHost()) {
            return;
        }
        const self = this.meshSession.getSelf();
        this.meshSession.sendAppMessage(this.roomState.hostPeerId, {
            type: 'slot-request',
            peerId: self.id,
            slotIndex,
            ...config,
        } satisfies LanRoomMessage);
    }

    leaveRoom(): void {
        if (this.roomState && this.isHost()) {
            const nextHostPeerId = this.findNextHostPeerId(this.roomState.hostPeerId);
            if (nextHostPeerId) {
                this.meshSession.broadcastAppMessage({
                    type: 'host-handover',
                    hostPeerId: nextHostPeerId,
                } satisfies LanRoomMessage);
            }
        }
        this.roomState = undefined;
        this.currentCustomMapFile = undefined;
        this.incomingTransfers.clear();
        this.launchDescriptor = undefined;
        this.dispatchSnapshot();
    }

    startGame(returnRoute: { screenType: number; params?: any }): LanLaunchDescriptor {
        if (!this.roomState || !this.isHost()) {
            throw new Error('只有房主可以开始游戏。');
        }
        if (!this.canStart()) {
            throw new Error('当前房间还不能开始游戏。');
        }
        const self = this.meshSession.getSelf();
        const descriptor: LanLaunchDescriptor = {
            kind: 'lan',
            roomId: this.lastMeshSnapshot.roomId ?? '',
            gameId: generateId(),
            timestamp: Date.now(),
            hostPeerId: this.roomState.hostPeerId,
            localPeerId: self.id,
            localPlayerName: self.name,
            gameOpts: cloneGameOpts(this.roomState.gameOpts),
            humanAssignments: this.roomState.humanAssignments.map((assignment) => ({ ...assignment })),
            mapTransferStateByPeerId: cloneMapTransferState(this.roomState.mapTransferStateByPeerId),
            returnRoute,
        };
        this.launchDescriptor = descriptor;
        this.meshSession.broadcastAppMessage({
            type: 'start-game',
            descriptor,
        } satisfies LanRoomMessage);
        this.onLaunch.dispatch(this, descriptor);
        this.dispatchSnapshot();
        return descriptor;
    }

    private handleMeshSnapshot(snapshot: LanMeshSnapshot): void {
        this.lastMeshSnapshot = snapshot;
        if (!snapshot.isInRoom) {
            this.roomState = undefined;
            this.currentCustomMapFile = undefined;
            this.incomingTransfers.clear();
            this.launchDescriptor = undefined;
            this.dispatchSnapshot();
            return;
        }
        if (!this.roomState) {
            this.dispatchSnapshot();
            return;
        }

        const previousHostPeerId = this.roomState.hostPeerId;
        this.reconcileRoomStateWithMesh();

        if (previousHostPeerId !== this.roomState.hostPeerId && this.isHost()) {
            this.log('info', '房主已迁移到当前客户端。');
            this.broadcastStateSync();
            this.scheduleCustomMapTransfers();
        }

        if (this.isHost()) {
            this.broadcastStateSync();
            this.scheduleCustomMapTransfers();
        }
        this.dispatchSnapshot();
    }

    private handleAppMessage(entry: LanMeshAppMessage, _sender: LanMeshSession): void {
        const payload = entry.payload;
        if (!payload || typeof payload !== 'object') {
            return;
        }
        const message = payload as LanRoomMessage;
        switch (message.type) {
            case 'state-sync':
                this.handleStateSync(entry.from, message);
                return;
            case 'slot-request':
                this.handleSlotRequest(entry.from, message);
                return;
            case 'ready':
                this.handleReady(entry.from, message);
                return;
            case 'map-offer':
                this.handleMapOffer(entry.from, message);
                return;
            case 'map-chunk':
                void this.handleMapChunk(entry.from, message);
                return;
            case 'map-complete':
                this.handleMapComplete(entry.from, message);
                return;
            case 'start-game':
                this.handleStartGame(entry.from, message);
                return;
            case 'host-handover':
                this.handleHostHandover(message);
                return;
            default:
                return;
        }
    }

    private handleStateSync(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'state-sync' }>): void {
        if (this.isHost() && from.id !== this.roomState?.hostPeerId) {
            return;
        }
        const selfPeerId = this.meshSession.getSelf().id;
        const previousLocalTransferState = this.roomState?.mapTransferStateByPeerId[selfPeerId];
        this.roomState = cloneRoomState(message.state);
        this.reconcileRoomStateWithMesh();
        if (!this.isHost() && previousLocalTransferState) {
            const nextRemoteTransferState = this.roomState.mapTransferStateByPeerId[selfPeerId];
            if (!nextRemoteTransferState ||
                getTransferStatePriority(previousLocalTransferState.status) > getTransferStatePriority(nextRemoteTransferState.status) ||
                (previousLocalTransferState.status === nextRemoteTransferState.status &&
                    previousLocalTransferState.updatedAt > nextRemoteTransferState.updatedAt)) {
                this.roomState.mapTransferStateByPeerId[selfPeerId] = { ...previousLocalTransferState };
            }
        }
        void this.ensureLocalCustomMapIfNeeded();
        this.dispatchSnapshot();
    }

    private handleSlotRequest(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'slot-request' }>): void {
        if (!this.roomState || !this.isHost() || message.peerId !== from.id) {
            return;
        }
        const assignment = this.roomState.humanAssignments.find((candidate) => candidate.peerId === from.id);
        if (!assignment || assignment.slotIndex !== message.slotIndex) {
            return;
        }
        const slotInfo = this.roomState.slotsInfo[assignment.slotIndex];
        if (!slotInfo || slotInfo.type !== NetSlotType.Player) {
            return;
        }
        const human = this.roomState.gameOpts.humanPlayers.find((player) => player.name === assignment.name);
        if (!human) {
            return;
        }
        human.countryId = message.countryId;
        human.colorId = message.colorId;
        human.startPos = message.startPos;
        human.teamId = message.teamId;
        this.broadcastStateSync();
        this.dispatchSnapshot();
    }

    private handleReady(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'ready' }>): void {
        if (!this.roomState || !this.isHost() || message.peerId !== from.id) {
            return;
        }
        this.roomState.readyStateByPeerId[from.id] = message.ready;
        this.broadcastStateSync();
        this.dispatchSnapshot();
    }

    private handleMapOffer(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'map-offer' }>): void {
        if (this.isHost() || !this.roomState || message.peerId !== this.meshSession.getSelf().id) {
            return;
        }
        this.incomingTransfers.set(from.id, {
            filename: message.filename,
            digest: message.digest,
            totalChunks: message.totalChunks,
            sizeBytes: message.sizeBytes,
            chunks: new Array(message.totalChunks),
        });
        this.updateLocalMapTransferState('receiving', message.sizeBytes, 0);
        this.dispatchSnapshot();
    }

    private async handleMapChunk(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'map-chunk' }>): Promise<void> {
        if (this.isHost() || !this.roomState || message.peerId !== this.meshSession.getSelf().id) {
            return;
        }
        const transfer = this.incomingTransfers.get(from.id);
        if (!transfer || transfer.digest !== message.digest) {
            return;
        }
        transfer.chunks[message.index] = message.data;
        const receivedCount = transfer.chunks.filter(Boolean).length;
        const receivedBytes = Math.min(transfer.sizeBytes, receivedCount * MAP_CHUNK_SIZE);
        this.updateLocalMapTransferState('receiving', transfer.sizeBytes, receivedBytes);
        this.dispatchSnapshot();

        if (receivedCount !== transfer.totalChunks) {
            return;
        }

        try {
            const bytes = base64StringToUint8Array(transfer.chunks.join(''));
            const file = VirtualFile.fromBytes(bytes, transfer.filename);
            if (MapDigest.compute(file) !== transfer.digest) {
                throw new Error('接收到的自定义地图摘要不匹配。');
            }
            this.currentCustomMapFile = file;
            await this.persistCustomMap(file);
            this.incomingTransfers.delete(from.id);
            this.updateLocalMapTransferState('complete', transfer.sizeBytes, transfer.sizeBytes);
            this.meshSession.sendAppMessage(this.roomState.hostPeerId, {
                type: 'map-complete',
                peerId: this.meshSession.getSelf().id,
                digest: transfer.digest,
                ok: true,
            } satisfies LanRoomMessage);
            this.dispatchSnapshot();
        }
        catch (error) {
            const errorText = (error as Error).message;
            this.updateLocalMapTransferState('error', transfer.sizeBytes, undefined, errorText);
            this.meshSession.sendAppMessage(this.roomState.hostPeerId, {
                type: 'map-complete',
                peerId: this.meshSession.getSelf().id,
                digest: transfer.digest,
                ok: false,
                error: errorText,
            } satisfies LanRoomMessage);
            this.dispatchSnapshot();
        }
    }

    private handleMapComplete(from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'map-complete' }>): void {
        if (!this.roomState || !this.isHost() || message.peerId !== from.id) {
            return;
        }
        this.roomState.mapTransferStateByPeerId[from.id] = message.ok
            ? createTransferState('complete', this.roomState.gameOpts.mapSizeBytes, this.roomState.gameOpts.mapSizeBytes)
            : createTransferState('error', this.roomState.gameOpts.mapSizeBytes, undefined, message.error);
        this.broadcastStateSync();
        this.dispatchSnapshot();
    }

    private handleStartGame(_from: LanPeerIdentity, message: Extract<LanRoomMessage, { type: 'start-game' }>): void {
        const descriptor = {
            ...message.descriptor,
            localPeerId: this.meshSession.getSelf().id,
            localPlayerName: this.meshSession.getSelf().name,
            returnRoute: message.descriptor.returnRoute,
        };
        this.launchDescriptor = descriptor;
        this.onLaunch.dispatch(this, descriptor);
        this.dispatchSnapshot();
    }

    private handleHostHandover(message: Extract<LanRoomMessage, { type: 'host-handover' }>): void {
        if (!this.roomState) {
            return;
        }
        this.roomState.hostPeerId = message.hostPeerId;
        this.reconcileRoomStateWithMesh();
        if (this.isHost()) {
            this.broadcastStateSync();
            this.scheduleCustomMapTransfers();
        }
        this.dispatchSnapshot();
    }

    private reconcileRoomStateWithMesh(): void {
        if (!this.roomState) {
            return;
        }
        const activeMembers = this.lastMeshSnapshot.members.map((member) => ({
            id: member.id,
            name: member.name,
        }));
        const activeIds = new Set(activeMembers.map((member) => member.id));

        this.roomState.memberOrder = this.roomState.memberOrder.filter((peerId) => activeIds.has(peerId));
        activeMembers.forEach((member) => {
            if (!this.roomState!.memberOrder.includes(member.id)) {
                this.roomState!.memberOrder.push(member.id);
            }
        });

        if (!activeIds.has(this.roomState.hostPeerId)) {
            const nextHostPeerId = this.findNextHostPeerId(this.roomState.hostPeerId);
            if (nextHostPeerId) {
                this.roomState.hostPeerId = nextHostPeerId;
            }
        }

        const readyStateByPeerId: Record<string, boolean> = {};
        const mapTransferStateByPeerId: Record<string, LanMapTransferPeerState> = {};
        activeMembers.forEach((member) => {
            readyStateByPeerId[member.id] = this.roomState!.readyStateByPeerId[member.id] ?? false;
            mapTransferStateByPeerId[member.id] = this.roomState!.mapTransferStateByPeerId[member.id] ??
                (this.roomState!.gameOpts.mapOfficial
                    ? createTransferState('complete', this.roomState!.gameOpts.mapSizeBytes, this.roomState!.gameOpts.mapSizeBytes)
                    : member.id === this.meshSession.getSelf().id && this.currentCustomMapFile
                        ? createTransferState('complete', this.roomState!.gameOpts.mapSizeBytes, this.roomState!.gameOpts.mapSizeBytes)
                        : createTransferState('pending', this.roomState!.gameOpts.mapSizeBytes, 0));
        });
        this.roomState.readyStateByPeerId = readyStateByPeerId;
        this.roomState.mapTransferStateByPeerId = mapTransferStateByPeerId;
        this.syncHumanAssignments(activeMembers);
    }

    private syncHumanAssignments(activeMembers: Array<{ id: string; name: string }>): void {
        if (!this.roomState) {
            return;
        }
        const state = this.roomState;
        const activeMemberMap = new Map(activeMembers.map((member) => [member.id, member]));
        const activePeerIds = new Set(activeMembers.map((member) => member.id));
        const previousAssignments = state.humanAssignments;
        const departedHumanSlots = new Set(previousAssignments
            .filter((assignment) => !activePeerIds.has(assignment.peerId))
            .map((assignment) => assignment.slotIndex));
        const previousHumanByPeerId = new Map<string, any>();
        previousAssignments.forEach((assignment) => {
            const existingHuman = state.gameOpts.humanPlayers.find((player) => player.name === assignment.name);
            if (existingHuman) {
                previousHumanByPeerId.set(assignment.peerId, cloneHumanPlayer(existingHuman));
            }
        });

        const nextAssignments: LanHumanAssignment[] = [];
        const takenSlots = new Set<number>();
        const visibleSlots = this.computeVisibleSlots(state);

        state.memberOrder.forEach((peerId) => {
            const member = activeMemberMap.get(peerId);
            if (!member) {
                return;
            }
            const previousAssignment = previousAssignments.find((candidate) => candidate.peerId === peerId);
            let slotIndex = previousAssignment?.slotIndex;
            if (slotIndex === undefined || slotIndex < 0 || slotIndex >= visibleSlots || takenSlots.has(slotIndex)) {
                slotIndex = this.findNextAssignableSlot(state, takenSlots, visibleSlots, departedHumanSlots);
            }
            if (slotIndex === undefined) {
                return;
            }
            takenSlots.add(slotIndex);
            nextAssignments.push({
                peerId,
                slotIndex,
                name: member.name,
            });
        });

        const nextHumans = nextAssignments
            .slice()
            .sort((left, right) => left.slotIndex - right.slotIndex)
            .map((assignment) => previousHumanByPeerId.get(assignment.peerId) ?? createDefaultHumanPlayer(assignment.name, this.gameModes.getById(state.gameOpts.gameMode).mpDialogSettings.mustAlly))
            .map((player: any, index) => ({
                ...player,
                name: nextAssignments.slice().sort((left, right) => left.slotIndex - right.slotIndex)[index].name,
            }));

        const nextSlotsInfo = cloneSlotsInfo(state.slotsInfo);
        const nextAiPlayers = state.gameOpts.aiPlayers.map(cloneAiPlayer);
        for (let slotIndex = 0; slotIndex < nextSlotsInfo.length; slotIndex += 1) {
            if (slotIndex >= visibleSlots) {
                nextSlotsInfo[slotIndex] = { type: NetSlotType.Closed };
                nextAiPlayers[slotIndex] = undefined;
                continue;
            }
            const assignment = nextAssignments.find((candidate) => candidate.slotIndex === slotIndex);
            if (assignment) {
                nextSlotsInfo[slotIndex] = {
                    type: NetSlotType.Player,
                    name: assignment.name,
                };
                nextAiPlayers[slotIndex] = undefined;
                continue;
            }
            if (nextSlotsInfo[slotIndex].type === NetSlotType.Player) {
                nextSlotsInfo[slotIndex] = { type: NetSlotType.Open };
                nextAiPlayers[slotIndex] = undefined;
                continue;
            }
            if (nextSlotsInfo[slotIndex].type !== NetSlotType.Ai) {
                nextAiPlayers[slotIndex] = undefined;
            }
        }

        state.humanAssignments = nextAssignments;
        state.gameOpts.humanPlayers = nextHumans;
        state.gameOpts.aiPlayers = nextAiPlayers;
        state.slotsInfo = nextSlotsInfo;
    }

    private computeVisibleSlots(state: LanRoomState): number {
        const observerActive = state.gameOpts.humanPlayers[0]?.countryId === OBS_COUNTRY_ID;
        return observerActive ? state.gameOpts.maxSlots + 1 : state.gameOpts.maxSlots;
    }

    private findNextAssignableSlot(state: LanRoomState, takenSlots: Set<number>, visibleSlots: number, departedHumanSlots: Set<number>): number | undefined {
        for (let slotIndex = 0; slotIndex < visibleSlots; slotIndex += 1) {
            if (takenSlots.has(slotIndex)) {
                continue;
            }
            if (state.slotsInfo[slotIndex]?.type === NetSlotType.Open) {
                return slotIndex;
            }
        }
        for (let slotIndex = 0; slotIndex < visibleSlots; slotIndex += 1) {
            if (takenSlots.has(slotIndex)) {
                continue;
            }
            if (departedHumanSlots.has(slotIndex)) {
                return slotIndex;
            }
        }
        for (let slotIndex = 0; slotIndex < visibleSlots; slotIndex += 1) {
            if (takenSlots.has(slotIndex)) {
                continue;
            }
            if (state.slotsInfo[slotIndex]?.type === NetSlotType.Ai) {
                return slotIndex;
            }
        }
        for (let slotIndex = 0; slotIndex < visibleSlots; slotIndex += 1) {
            if (!takenSlots.has(slotIndex) && state.slotsInfo[slotIndex]?.type === NetSlotType.Closed) {
                return slotIndex;
            }
        }
        return undefined;
    }

    private findNextHostPeerId(currentHostPeerId: string): string | undefined {
        if (!this.roomState) {
            return undefined;
        }
        return this.roomState.memberOrder.find((peerId) => peerId !== currentHostPeerId && this.lastMeshSnapshot.members.some((member) => member.id === peerId));
    }

    private broadcastStateSync(): void {
        if (!this.roomState) {
            return;
        }
        this.meshSession.broadcastAppMessage({
            type: 'state-sync',
            state: cloneRoomState(this.roomState),
        } satisfies LanRoomMessage);
    }

    private scheduleCustomMapTransfers(): void {
        if (!this.roomState || !this.isHost() || this.roomState.gameOpts.mapOfficial || !this.currentCustomMapFile) {
            return;
        }
        this.lastMeshSnapshot.members
            .filter((member) => !member.isSelf && member.status === 'connected')
            .forEach((member) => {
                const transferState = this.roomState!.mapTransferStateByPeerId[member.id];
                if (transferState?.status === 'complete' || transferState?.status === 'sending') {
                    return;
                }
                void this.sendMapToPeer(member.id);
            });
    }

    private async sendMapToPeer(peerId: string): Promise<void> {
        if (!this.roomState || !this.currentCustomMapFile || !this.isHost()) {
            return;
        }
        const bytes = this.currentCustomMapFile.getBytes();
        const base64 = uint8ArrayToBase64String(bytes);
        const chunks: string[] = [];
        for (let offset = 0; offset < base64.length; offset += MAP_CHUNK_SIZE) {
            chunks.push(base64.slice(offset, offset + MAP_CHUNK_SIZE));
        }
        this.roomState.mapTransferStateByPeerId[peerId] = createTransferState('sending', this.roomState.gameOpts.mapSizeBytes, 0);
        this.broadcastStateSync();
        this.meshSession.sendAppMessage(peerId, {
            type: 'map-offer',
            peerId,
            filename: this.roomState.gameOpts.mapName,
            digest: this.roomState.gameOpts.mapDigest,
            sizeBytes: this.roomState.gameOpts.mapSizeBytes,
            totalChunks: chunks.length,
        } satisfies LanRoomMessage);
        for (let index = 0; index < chunks.length; index += 1) {
            this.meshSession.sendAppMessage(peerId, {
                type: 'map-chunk',
                peerId,
                digest: this.roomState.gameOpts.mapDigest,
                index,
                totalChunks: chunks.length,
                data: chunks[index],
            } satisfies LanRoomMessage);
            this.roomState.mapTransferStateByPeerId[peerId] = createTransferState(
                'sending',
                this.roomState.gameOpts.mapSizeBytes,
                Math.min(this.roomState.gameOpts.mapSizeBytes, Math.floor(((index + 1) / chunks.length) * this.roomState.gameOpts.mapSizeBytes))
            );
            this.broadcastStateSync();
            await Promise.resolve();
        }
    }

    private async ensureLocalCustomMapIfNeeded(): Promise<void> {
        if (!this.roomState || this.roomState.gameOpts.mapOfficial || this.currentCustomMapFile) {
            return;
        }
        try {
            const localFile = await this.mapFileLoader.load(this.roomState.gameOpts.mapName);
            const localVirtualFile = VirtualFile.fromBytes(localFile.getBytes(), this.roomState.gameOpts.mapName);
            if (MapDigest.compute(localVirtualFile) === this.roomState.gameOpts.mapDigest) {
                this.currentCustomMapFile = localVirtualFile;
                this.updateLocalMapTransferState('complete', this.roomState.gameOpts.mapSizeBytes, this.roomState.gameOpts.mapSizeBytes);
                if (!this.isHost()) {
                    this.meshSession.sendAppMessage(this.roomState.hostPeerId, {
                        type: 'map-complete',
                        peerId: this.meshSession.getSelf().id,
                        digest: this.roomState.gameOpts.mapDigest,
                        ok: true,
                    } satisfies LanRoomMessage);
                }
                this.dispatchSnapshot();
            }
        }
        catch {
        }
    }

    private updateLocalMapTransferState(status: LanMapTransferPeerState['status'], totalBytes?: number, receivedBytes?: number, error?: string): void {
        if (!this.roomState) {
            return;
        }
        const selfPeerId = this.meshSession.getSelf().id;
        this.roomState.mapTransferStateByPeerId[selfPeerId] = createTransferState(status, totalBytes, receivedBytes, error);
        if (!this.isHost()) {
            this.dispatchSnapshot();
        }
    }

    private async persistCustomMap(file: VirtualFile): Promise<void> {
        if (!this.mapDir) {
            return;
        }
        if (!(await this.mapDir.containsEntry(file.filename))) {
            await this.mapDir.writeFile(file);
            this.mapList?.addFromMapFile(file);
        }
    }

    private isHost(): boolean {
        return this.roomState?.hostPeerId === this.meshSession.getSelf().id;
    }

    private canStart(): boolean {
        if (!this.roomState || !this.isHost()) {
            return false;
        }
        if (this.roomState.humanAssignments.length < 2) {
            return false;
        }
        if (this.roomState.humanAssignments.length !== this.lastMeshSnapshot.members.length) {
            return false;
        }
        const connectedMembers = this.lastMeshSnapshot.members.filter((member) => member.isSelf || member.status === 'connected');
        if (connectedMembers.length !== this.lastMeshSnapshot.members.length) {
            return false;
        }
        if (!this.roomState.gameOpts.mapOfficial) {
            return this.lastMeshSnapshot.members.every((member) => this.roomState!.mapTransferStateByPeerId[member.id]?.status === 'complete');
        }
        return true;
    }

    private canInvite(): boolean {
        if (!this.roomState || !this.lastMeshSnapshot.isInRoom) {
            return false;
        }
        const visibleSlots = this.computeVisibleSlots(this.roomState);
        const occupiedSlots = new Set(this.roomState.humanAssignments.map((assignment) => assignment.slotIndex));
        for (let slotIndex = 0; slotIndex < visibleSlots; slotIndex += 1) {
            if (occupiedSlots.has(slotIndex)) {
                continue;
            }
            const slotType = this.roomState.slotsInfo[slotIndex]?.type;
            if (slotType === NetSlotType.Open || slotType === NetSlotType.OpenObserver) {
                return true;
            }
        }
        return false;
    }

    private createSnapshot(): LanRoomSnapshot {
        const roomState = this.roomState ? cloneRoomState(this.roomState) : undefined;
        const hostPeerId = roomState?.hostPeerId;
        const members = this.lastMeshSnapshot.members.map((member) => {
            const assignment = roomState?.humanAssignments.find((candidate) => candidate.peerId === member.id);
            return {
                peerId: member.id,
                name: member.name,
                isSelf: member.isSelf,
                isHost: hostPeerId === member.id,
                isConnected: member.isSelf || member.status === 'connected',
                slotIndex: assignment?.slotIndex,
                ready: roomState?.readyStateByPeerId[member.id] ?? false,
                mapTransfer: roomState?.mapTransferStateByPeerId[member.id] ?? createTransferState('idle'),
            };
        });

        return {
            self: this.meshSession.getSelf(),
            mesh: this.lastMeshSnapshot,
            isRoomActive: Boolean(roomState),
            isHost: Boolean(hostPeerId && hostPeerId === this.meshSession.getSelf().id),
            hostPeerId,
            roomState,
            members,
            localMapFileReady: roomState ? roomState.gameOpts.mapOfficial || Boolean(this.currentCustomMapFile) : false,
            canInvite: this.canInvite(),
            canStart: this.canStart(),
            launchDescriptor: this.launchDescriptor,
        };
    }

    private dispatchSnapshot(): void {
        this.onSnapshotChange.dispatch(this, this.createSnapshot());
    }

    private log(level: 'info' | 'warn' | 'error', text: string): void {
        this.onLog.dispatch(this, {
            level,
            text,
            timestamp: Date.now(),
        });
    }
}
