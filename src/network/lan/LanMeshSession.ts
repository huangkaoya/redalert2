import { EventDispatcher } from '@/util/event';
import {
    decodeLanQrPacket,
    encodeLanQrPacket,
    LanInvitePacket,
    LanJoinResponsePacket,
    LanPeerIdentity,
} from '@/network/lan/LanQrPayload';
import { formatSdpCandidateSummary, getSdpCandidateWarning, summarizeSdpCandidates } from '@/network/lan/SdpCandidateDiagnostics';

type ControlEnvelope =
    | {
        type: 'hello';
        roomId: string;
        self: LanPeerIdentity;
        members: LanPeerIdentity[];
    }
    | {
        type: 'room-sync';
        roomId: string;
        members: LanPeerIdentity[];
    }
    | {
        type: 'member-join';
        roomId: string;
        member: LanPeerIdentity;
    }
    | {
        type: 'member-leave';
        roomId: string;
        peerId: string;
        reason: 'left' | 'disconnect';
    }
    | {
        type: 'mesh-connect-request';
        roomId: string;
        target: LanPeerIdentity;
    }
    | {
        type: 'relay-signal';
        roomId: string;
        source: LanPeerIdentity;
        targetPeerId: string;
        signalType: 'offer' | 'answer';
        description: RTCSessionDescriptionInit;
    }
    | {
        type: 'chat';
        roomId: string;
        from: LanPeerIdentity;
        text: string;
        timestamp: number;
    }
    | {
        type: 'app-message';
        roomId: string;
        from: LanPeerIdentity;
        payload: unknown;
    };

type LinkRole = 'inviter' | 'joiner' | 'mesh-offerer' | 'mesh-answerer';
type LinkStatus = 'connecting' | 'connected' | 'closed';

interface LinkContext {
    key: string;
    peer?: LanPeerIdentity;
    pc: RTCPeerConnection;
    channel?: RTCDataChannel;
    role: LinkRole;
    status: LinkStatus;
}

interface PendingInvite {
    inviteId: string;
    context: LinkContext;
}

interface ActiveQrPayload {
    kind: 'invite' | 'join-response';
    text: string;
    title: string;
    description: string;
}

export interface LanMemberSnapshot extends LanPeerIdentity {
    isSelf: boolean;
    isDirect: boolean;
    status: 'self' | 'known' | 'connected' | 'connecting';
}

export interface LanMeshSnapshot {
    self: LanPeerIdentity;
    roomId?: string;
    isInRoom: boolean;
    roomReady: boolean;
    directPeerCount: number;
    members: LanMemberSnapshot[];
    activeQrPayloadText: string;
    activeQrPayloadKind?: 'invite' | 'join-response';
    activeQrPayloadTitle?: string;
    activeQrPayloadDescription?: string;
}

export interface LanMeshLogEntry {
    level: 'info' | 'warn' | 'error';
    text: string;
    timestamp: number;
}

export interface LanMeshChatEntry {
    from: LanPeerIdentity;
    text: string;
    timestamp: number;
}

export interface LanMeshAppMessage {
    from: LanPeerIdentity;
    payload: unknown;
    timestamp: number;
}

const ICE_GATHER_TIMEOUT_MILLIS = 10000;

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;
        const value = char === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

function generateShortCode(): string {
    return generateId().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function createPeerConnection(): RTCPeerConnection {
    if (typeof RTCPeerConnection === 'undefined') {
        throw new Error('当前浏览器不支持 WebRTC。');
    }
    return new RTCPeerConnection({
        iceServers: [],
    });
}

export class LanMeshSession {
    private readonly self: LanPeerIdentity = {
        id: generateId(),
        name: `玩家-${generateShortCode()}`,
    };
    private roomId?: string;
    private readonly members = new Map<string, LanPeerIdentity>();
    private readonly linksByKey = new Map<string, LinkContext>();
    private readonly directLinks = new Map<string, LinkContext>();
    private pendingInvite?: PendingInvite;
    private activeQrPayload?: ActiveQrPayload;

    public readonly onSnapshotChange = new EventDispatcher<this, LanMeshSnapshot>();
    public readonly onLog = new EventDispatcher<this, LanMeshLogEntry>();
    public readonly onChat = new EventDispatcher<this, LanMeshChatEntry>();
    public readonly onAppMessage = new EventDispatcher<this, LanMeshAppMessage>();

    constructor() {
        this.members.set(this.self.id, this.self);
    }

    getSnapshot(): LanMeshSnapshot {
        return this.createSnapshot();
    }

    getSelf(): LanPeerIdentity {
        return { ...this.self };
    }

    ensureLocalRoom(): LanMeshSnapshot {
        this.ensureRoom();
        this.dispatchSnapshot();
        return this.createSnapshot();
    }

    updateSelfName(name: string): void {
        const trimmed = name.trim();
        if (!trimmed || trimmed === this.self.name) {
            return;
        }
        this.self.name = trimmed.slice(0, 24);
        this.members.set(this.self.id, { ...this.self });
        if (this.isInRoom()) {
            this.broadcastRoomSync();
        }
        this.dispatchSnapshot();
    }

    async createRoomInvite(): Promise<void> {
        this.ensureRoom();
        this.disposePendingInvite();

        const context = this.createOutgoingLink(undefined, 'inviter');
        const inviteId = generateId();
        this.pendingInvite = {
            inviteId,
            context,
        };

        this.log('info', '正在生成邀请二维码...');
        await context.pc.setLocalDescription(await context.pc.createOffer());
        await this.waitForIceGatheringComplete(context.pc);
        this.logLinkDiagnostics(context, '邀请 Offer');

        const packet: LanInvitePacket = {
            version: 1,
            kind: 'invite',
            roomId: this.roomId!,
            inviteId,
            inviter: { ...this.self },
            description: context.pc.localDescription!,
        };

        this.activeQrPayload = {
            kind: 'invite',
            text: await encodeLanQrPacket(packet),
            title: '邀请二维码',
            description: '让新玩家扫描这张二维码，加入当前房间。',
        };
        this.log('info', '邀请二维码已生成，等待对方回传加入响应。');
        this.dispatchSnapshot();
    }

    async importPayload(payloadText: string): Promise<void> {
        const packet = await decodeLanQrPacket(payloadText);

        if (packet.kind === 'invite') {
            await this.acceptInvite(packet);
            return;
        }

        await this.acceptJoinResponse(packet);
    }

    async sendChat(text: string): Promise<void> {
        const normalizedText = text.trim();
        if (!normalizedText) {
            return;
        }
        if (!this.directLinks.size) {
            throw new Error('当前还没有直连玩家，无法发送房间消息。');
        }

        const envelope: ControlEnvelope = {
            type: 'chat',
            roomId: this.roomId!,
            from: { ...this.self },
            text: normalizedText,
            timestamp: Date.now(),
        };
        this.broadcastEnvelope(envelope);
        this.onChat.dispatch(this, {
            from: { ...this.self },
            text: normalizedText,
            timestamp: envelope.timestamp,
        });
    }

    broadcastAppMessage(payload: unknown, excludedPeerId?: string): void {
        if (!this.roomId) {
            throw new Error('当前还没有局域网房间。');
        }
        const envelope: ControlEnvelope = {
            type: 'app-message',
            roomId: this.roomId,
            from: { ...this.self },
            payload,
        };
        this.broadcastEnvelope(envelope, excludedPeerId);
    }

    sendAppMessage(peerId: string, payload: unknown): void {
        if (!this.roomId) {
            throw new Error('当前还没有局域网房间。');
        }
        this.sendDirectEnvelope(peerId, {
            type: 'app-message',
            roomId: this.roomId,
            from: { ...this.self },
            payload,
        });
    }

    leaveRoom(): void {
        if (this.isInRoom()) {
            this.broadcastEnvelope({
                type: 'member-leave',
                roomId: this.roomId!,
                peerId: this.self.id,
                reason: 'left',
            });
        }
        this.reset();
    }

    reset(): void {
        this.disposePendingInvite();
        Array.from(this.linksByKey.values()).forEach((context) => this.disposeLink(context));
        this.linksByKey.clear();
        this.directLinks.clear();
        this.roomId = undefined;
        this.members.clear();
        this.members.set(this.self.id, { ...this.self });
        this.activeQrPayload = undefined;
        this.dispatchSnapshot();
    }

    private isInRoom(): boolean {
        return Boolean(this.roomId);
    }

    private ensureRoom(): void {
        if (!this.roomId) {
            this.roomId = generateShortCode();
            this.members.set(this.self.id, { ...this.self });
            this.log('info', `已创建局域网房间 ${this.roomId}。`);
        }
    }

    private createSnapshot(): LanMeshSnapshot {
        const members = Array.from(this.members.values())
            .map((member) => {
                const directLink = this.directLinks.get(member.id);
                return {
                    ...member,
                    isSelf: member.id === this.self.id,
                    isDirect: member.id === this.self.id || Boolean(directLink),
                    status: member.id === this.self.id
                        ? 'self'
                        : !directLink
                            ? 'known'
                            : directLink.status === 'connected'
                                ? 'connected'
                                : 'connecting',
                } satisfies LanMemberSnapshot;
            })
            .sort((left, right) => {
                if (left.isSelf) {
                    return -1;
                }
                if (right.isSelf) {
                    return 1;
                }
                return left.name.localeCompare(right.name, 'zh-Hans-CN');
            });

        return {
            self: { ...this.self },
            roomId: this.roomId,
            isInRoom: this.isInRoom(),
            roomReady: this.directLinks.size > 0,
            directPeerCount: Array.from(this.directLinks.values()).filter((context) => context.status === 'connected').length,
            members,
            activeQrPayloadText: this.activeQrPayload?.text ?? '',
            activeQrPayloadKind: this.activeQrPayload?.kind,
            activeQrPayloadTitle: this.activeQrPayload?.title,
            activeQrPayloadDescription: this.activeQrPayload?.description,
        };
    }

    private dispatchSnapshot(): void {
        this.onSnapshotChange.dispatch(this, this.createSnapshot());
    }

    private createOutgoingLink(peer: LanPeerIdentity | undefined, role: LinkRole): LinkContext {
        const context: LinkContext = {
            key: generateId(),
            peer,
            pc: createPeerConnection(),
            role,
            status: 'connecting',
        };
        this.linksByKey.set(context.key, context);
        if (peer) {
            this.directLinks.set(peer.id, context);
        }
        this.bindPeerEvents(context);
        this.attachDataChannel(context, context.pc.createDataChannel('ra2-lan-room', {
            ordered: true,
        }));
        this.dispatchSnapshot();
        return context;
    }

    private createIncomingLink(peer: LanPeerIdentity, role: LinkRole): LinkContext {
        const context: LinkContext = {
            key: generateId(),
            peer,
            pc: createPeerConnection(),
            role,
            status: 'connecting',
        };
        this.linksByKey.set(context.key, context);
        this.directLinks.set(peer.id, context);
        this.bindPeerEvents(context);
        context.pc.ondatachannel = (event) => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            this.attachDataChannel(context, event.channel);
        };
        this.dispatchSnapshot();
        return context;
    }

    private bindPeerEvents(context: LinkContext): void {
        const { pc } = context;

        pc.addEventListener('connectionstatechange', () => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                this.handleLinkClosed(context, pc.connectionState === 'closed' ? 'left' : 'disconnect');
                return;
            }
            this.dispatchSnapshot();
        });
        pc.addEventListener('icecandidateerror', (event) => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            const address = 'address' in event && typeof event.address === 'string' ? ` ${event.address}` : '';
            this.log('warn', `${context.peer?.name ?? '未知玩家'} 的 ICE 候选采集报错${address}：${event.errorText || 'unknown error'}。`);
        });
    }

    private attachDataChannel(context: LinkContext, channel: RTCDataChannel): void {
        context.channel = channel;
        channel.binaryType = 'arraybuffer';

        channel.addEventListener('open', () => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            context.status = 'connected';
            if (context.peer) {
                this.members.set(context.peer.id, { ...context.peer });
            }
            this.handleLinkOpened(context);
            this.dispatchSnapshot();
        });

        channel.addEventListener('close', () => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            this.handleLinkClosed(context, 'disconnect');
        });

        channel.addEventListener('error', () => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            this.log('error', `${context.peer?.name ?? '未知玩家'} 的数据通道发生错误。`);
        });

        channel.addEventListener('message', (event) => {
            if (!this.linksByKey.has(context.key)) {
                return;
            }
            this.handleChannelMessage(context, event.data);
        });
    }

    private async acceptInvite(packet: LanInvitePacket): Promise<void> {
        if (this.roomId && this.members.size > 1) {
            throw new Error('你已经在一个局域网房间里，无法再扫描其他房间邀请码。');
        }

        this.reset();
        this.roomId = packet.roomId;
        this.members.set(this.self.id, { ...this.self });
        this.members.set(packet.inviter.id, packet.inviter);

        const context = this.createIncomingLink(packet.inviter, 'joiner');
        this.log('info', `正在加入房间 ${packet.roomId}，等待生成响应二维码...`);

        await context.pc.setRemoteDescription(packet.description);
        await context.pc.setLocalDescription(await context.pc.createAnswer());
        await this.waitForIceGatheringComplete(context.pc);
        this.logLinkDiagnostics(context, '加入 Answer');

        const response: LanJoinResponsePacket = {
            version: 1,
            kind: 'join-response',
            roomId: packet.roomId,
            inviteId: packet.inviteId,
            inviterPeerId: packet.inviter.id,
            joiner: { ...this.self },
            description: context.pc.localDescription!,
        };

        this.activeQrPayload = {
            kind: 'join-response',
            text: await encodeLanQrPacket(response),
            title: '加入响应二维码',
            description: `让 ${packet.inviter.name} 扫描这张二维码，完成你的入房。`,
        };
        this.dispatchSnapshot();
    }

    private async acceptJoinResponse(packet: LanJoinResponsePacket): Promise<void> {
        if (!this.pendingInvite) {
            throw new Error('当前没有等待中的邀请二维码。');
        }
        if (packet.inviterPeerId !== this.self.id || packet.inviteId !== this.pendingInvite.inviteId) {
            throw new Error('这个加入响应不属于当前邀请二维码。');
        }

        const { context } = this.pendingInvite;
        context.peer = packet.joiner;
        this.directLinks.set(packet.joiner.id, context);
        this.members.set(packet.joiner.id, packet.joiner);
        this.log('info', `正在接入 ${packet.joiner.name}...`);
        await context.pc.setRemoteDescription(packet.description);
        this.pendingInvite = undefined;
        this.activeQrPayload = undefined;
        this.dispatchSnapshot();
    }

    private handleLinkOpened(context: LinkContext): void {
        if (!context.peer || !this.roomId) {
            return;
        }

        this.sendDirectEnvelope(context.peer.id, {
            type: 'hello',
            roomId: this.roomId,
            self: { ...this.self },
            members: this.getMemberList(),
        });

        if (context.role === 'inviter') {
            this.log('info', `${context.peer.name} 已加入房间，正在补齐与其他成员的直连。`);
            this.broadcastRoomSync();
            Array.from(this.directLinks.values())
                .filter((link) => link.peer && link.peer.id !== context.peer!.id && link.status === 'connected')
                .forEach((link) => {
                    this.sendDirectEnvelope(link.peer!.id, {
                        type: 'member-join',
                        roomId: this.roomId!,
                        member: context.peer!,
                    });
                    this.sendDirectEnvelope(link.peer!.id, {
                        type: 'mesh-connect-request',
                        roomId: this.roomId!,
                        target: context.peer!,
                    });
                });
        }

        if (context.role === 'joiner') {
            this.activeQrPayload = undefined;
            this.log('info', '已接入房间，等待其他成员自动补齐直连。');
        }

        if (context.role === 'mesh-offerer' || context.role === 'mesh-answerer') {
            this.log('info', `已和 ${context.peer.name} 建立直连。`);
            this.broadcastRoomSync();
        }
    }

    private handleLinkClosed(context: LinkContext, reason: 'left' | 'disconnect'): void {
        if (!this.linksByKey.has(context.key)) {
            return;
        }

        this.linksByKey.delete(context.key);
        context.status = 'closed';

        if (context.peer) {
            this.directLinks.delete(context.peer.id);
            if (this.members.delete(context.peer.id)) {
                this.log(reason === 'left' ? 'info' : 'warn', `${context.peer.name} 已离开房间。`);
            }
        }

        this.disposeLink(context);
        this.broadcastRoomSync();
        this.dispatchSnapshot();
    }

    private handleChannelMessage(context: LinkContext, data: string | ArrayBuffer | Blob): void {
        if (typeof data === 'string') {
            this.handleEnvelopeText(context, data);
            return;
        }
        if (data instanceof ArrayBuffer) {
            this.handleEnvelopeText(context, new TextDecoder().decode(new Uint8Array(data)));
            return;
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            data.text().then((text) => this.handleEnvelopeText(context, text)).catch((error) => {
                this.log('warn', `读取联机消息失败：${(error as Error).message}`);
            });
        }
    }

    private handleEnvelopeText(context: LinkContext, text: string): void {
        let payload: ControlEnvelope | undefined;
        try {
            payload = JSON.parse(text) as ControlEnvelope;
        }
        catch {
            payload = undefined;
        }

        if (!payload || typeof payload !== 'object') {
            this.log('warn', '收到了无法识别的房间消息。');
            return;
        }

        switch (payload.type) {
            case 'hello':
                this.mergeMembers(payload.self, ...payload.members);
                this.dispatchSnapshot();
                return;
            case 'room-sync':
                this.mergeMembers(...payload.members);
                this.dispatchSnapshot();
                return;
            case 'member-join':
                this.members.set(payload.member.id, payload.member);
                this.log('info', `${payload.member.name} 已进入房间。`);
                this.dispatchSnapshot();
                return;
            case 'member-leave':
                if (payload.peerId !== this.self.id) {
                    this.removePeer(payload.peerId, payload.reason);
                }
                return;
            case 'mesh-connect-request':
                this.handleMeshConnectRequest(context, payload.target).catch((error) => {
                    this.log('warn', `为 ${payload.target.name} 发起直连失败：${(error as Error).message}`);
                });
                return;
            case 'relay-signal':
                this.handleRelaySignal(context, payload).catch((error) => {
                    this.log('warn', `处理转发信令失败：${(error as Error).message}`);
                });
                return;
            case 'chat':
                this.onChat.dispatch(this, {
                    from: payload.from,
                    text: payload.text,
                    timestamp: payload.timestamp,
                });
                return;
            case 'app-message':
                this.onAppMessage.dispatch(this, {
                    from: payload.from,
                    payload: payload.payload,
                    timestamp: Date.now(),
                });
                return;
            default:
                this.log('warn', '收到了未知类型的联机控制消息。');
        }
    }

    private async handleMeshConnectRequest(relayContext: LinkContext, target: LanPeerIdentity): Promise<void> {
        if (!relayContext.peer || target.id === this.self.id || this.directLinks.has(target.id)) {
            return;
        }

        this.members.set(target.id, target);
        const context = this.createOutgoingLink(target, 'mesh-offerer');
        await context.pc.setLocalDescription(await context.pc.createOffer());
        await this.waitForIceGatheringComplete(context.pc);
        this.logLinkDiagnostics(context, `对 ${target.name} 的 mesh Offer`);

        this.sendDirectEnvelope(relayContext.peer.id, {
            type: 'relay-signal',
            roomId: this.roomId!,
            source: { ...this.self },
            targetPeerId: target.id,
            signalType: 'offer',
            description: context.pc.localDescription!,
        });
    }

    private async handleRelaySignal(relayContext: LinkContext, payload: Extract<ControlEnvelope, { type: 'relay-signal' }>): Promise<void> {
        if (!relayContext.peer) {
            return;
        }

        if (payload.targetPeerId !== this.self.id) {
            this.sendDirectEnvelope(payload.targetPeerId, payload);
            return;
        }

        this.members.set(payload.source.id, payload.source);

        if (payload.signalType === 'offer') {
            if (this.directLinks.has(payload.source.id)) {
                return;
            }
            const context = this.createIncomingLink(payload.source, 'mesh-answerer');
            await context.pc.setRemoteDescription(payload.description);
            await context.pc.setLocalDescription(await context.pc.createAnswer());
            await this.waitForIceGatheringComplete(context.pc);
            this.logLinkDiagnostics(context, `对 ${payload.source.name} 的 mesh Answer`);

            this.sendDirectEnvelope(relayContext.peer.id, {
                type: 'relay-signal',
                roomId: this.roomId!,
                source: { ...this.self },
                targetPeerId: payload.source.id,
                signalType: 'answer',
                description: context.pc.localDescription!,
            });
            return;
        }

        const existingLink = this.directLinks.get(payload.source.id);
        if (!existingLink) {
            throw new Error(`没有找到 ${payload.source.name} 的待完成直连。`);
        }
        await existingLink.pc.setRemoteDescription(payload.description);
    }

    private mergeMembers(...members: LanPeerIdentity[]): void {
        members.forEach((member) => {
            this.members.set(member.id, member);
        });
    }

    private removePeer(peerId: string, reason: 'left' | 'disconnect'): void {
        const member = this.members.get(peerId);
        this.members.delete(peerId);
        const link = this.directLinks.get(peerId);
        if (link) {
            this.linksByKey.delete(link.key);
            this.directLinks.delete(peerId);
            this.disposeLink(link);
        }
        if (member) {
            this.log(reason === 'left' ? 'info' : 'warn', `${member.name} 已离开房间。`);
        }
        this.dispatchSnapshot();
    }

    private getMemberList(): LanPeerIdentity[] {
        return Array.from(this.members.values()).map((member) => ({ ...member }));
    }

    private broadcastRoomSync(): void {
        if (!this.roomId || !this.directLinks.size) {
            this.dispatchSnapshot();
            return;
        }
        this.broadcastEnvelope({
            type: 'room-sync',
            roomId: this.roomId,
            members: this.getMemberList(),
        });
    }

    private broadcastEnvelope(envelope: ControlEnvelope, excludedPeerId?: string): void {
        Array.from(this.directLinks.values())
            .filter((context) => context.peer && context.peer.id !== excludedPeerId && context.status === 'connected')
            .forEach((context) => {
                try {
                    this.safeSend(context, envelope);
                }
                catch (error) {
                    this.log('warn', `向 ${context.peer?.name ?? '未知玩家'} 发送联机消息失败：${(error as Error).message}`);
                    this.handleLinkClosed(context, 'disconnect');
                }
            });
    }

    private sendDirectEnvelope(peerId: string, envelope: ControlEnvelope): void {
        const context = this.directLinks.get(peerId);
        if (!context) {
            throw new Error(`没有到 ${peerId} 的直连通道。`);
        }
        try {
            this.safeSend(context, envelope);
        }
        catch (error) {
            this.log('warn', `向 ${context.peer?.name ?? peerId} 发送联机消息失败：${(error as Error).message}`);
            this.handleLinkClosed(context, 'disconnect');
            throw error;
        }
    }

    private safeSend(context: LinkContext, envelope: ControlEnvelope): void {
        if (!context.channel || context.channel.readyState !== 'open') {
            throw new Error(`和 ${context.peer?.name ?? '未知玩家'} 的数据通道尚未打开。`);
        }
        context.channel.send(JSON.stringify(envelope));
    }

    private async waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
        if (pc.iceGatheringState === 'complete') {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error('ICE 候选收集超时，请稍后重试。'));
            }, ICE_GATHER_TIMEOUT_MILLIS);

            const handleChange = () => {
                if (pc.iceGatheringState === 'complete') {
                    cleanup();
                    resolve();
                }
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                pc.removeEventListener('icegatheringstatechange', handleChange);
            };

            pc.addEventListener('icegatheringstatechange', handleChange);
        });
    }

    private disposePendingInvite(): void {
        if (!this.pendingInvite) {
            return;
        }
        this.disposeLink(this.pendingInvite.context);
        this.linksByKey.delete(this.pendingInvite.context.key);
        this.pendingInvite = undefined;
    }

    private disposeLink(context: LinkContext): void {
        try {
            context.channel?.close();
        }
        catch {
        }
        try {
            context.pc.close();
        }
        catch {
        }
    }

    private log(level: LanMeshLogEntry['level'], text: string): void {
        this.onLog.dispatch(this, {
            level,
            text,
            timestamp: Date.now(),
        });
    }

    private logLinkDiagnostics(context: LinkContext, label: string): void {
        const summary = summarizeSdpCandidates(context.pc.localDescription);
        this.log('info', `${label} 候选情况：${formatSdpCandidateSummary(summary)}。`);
        const warning = getSdpCandidateWarning(summary);
        if (warning) {
            this.log('warn', warning);
        }
    }
}
