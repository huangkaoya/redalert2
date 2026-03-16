import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { HudChat } from "./HudChat";
import { ChatRecipientType } from "@/network/chat/ChatMessage";
import { RECIPIENT_ALL } from "@/network/gservConfig";
type Message = {
    color: string;
    text: string;
    animate: boolean;
    time: number;
};
type MessagesProps = UiComponentProps & {
    x?: number;
    y?: number;
    width: number;
    height: number;
    zIndex?: number;
    strings: any;
    messages: {
        getAll: () => Message[];
        prune: () => void;
        isComposing: boolean;
    };
    chatHistory: any;
    onMessageSubmit: (e: any) => void;
    onMessageCancel: () => void;
    onMessageTick?: () => void;
};
export class Messages extends UiComponent<MessagesProps> {
    declare ctx: CanvasRenderingContext2D | null;
    declare texture: THREE.Texture;
    declare mesh: THREE.Mesh;
    declare inputContainer: any;
    declare inputComponent: any;
    declare lastUpdate?: number;
    declare lastMessageTime?: number;
    declare lastMessageCount?: number;
    declare lastComposing?: boolean;
    createUiObject(): UiObject {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        const width = this.props.width;
        const height = this.props.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        this.ctx = canvas.getContext("2d", { alpha: true });
        this.texture = this.createTexture(canvas);
        this.mesh = this.createMesh(width, height);
        return obj;
    }
    createTexture(canvas: HTMLCanvasElement): THREE.Texture {
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }
    createMesh(width: number, height: number): THREE.Mesh {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
        geometry.translate(width / 2, height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            transparent: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }
    defineChildren() {
        return jsx("fragment", null, jsx("container", { hidden: true, ref: (e: any) => (this.inputContainer = e) }, jsx(HtmlView, {
            component: HudChat,
            props: {
                strings: this.props.strings,
                messageList: this.props.messages,
                chatHistory: this.props.chatHistory,
                onSubmit: this.props.onMessageSubmit,
                onCancel: this.props.onMessageCancel,
            },
            innerRef: (e: any) => (this.inputComponent = e),
        })), jsx("mesh", { zIndex: this.props.zIndex }, this.mesh));
    }
    onFrame(now: number) {
        if (!this.lastUpdate || now - this.lastUpdate >= 1000 / 30) {
            this.lastUpdate = now;
            this.props.messages.prune();
            const messages = this.props.messages.getAll();
            const nowTime = Date.now();
            const lastMsgTime = messages[messages.length - 1]?.time;
            const msgCount = messages.length;
            const isComposing = this.props.messages.isComposing;
            if (this.lastComposing !== isComposing ||
                this.lastMessageTime !== lastMsgTime ||
                msgCount !== this.lastMessageCount ||
                (lastMsgTime && nowTime - lastMsgTime <= 2000)) {
                this.lastMessageTime = lastMsgTime;
                this.lastMessageCount = msgCount;
                this.lastComposing = isComposing;
                this.drawMessages(isComposing, messages, nowTime);
                this.inputContainer.setVisible(isComposing);
                this.inputComponent.refresh();
            }
        }
    }
    drawMessages(isComposing: boolean, messages: Message[], now: number) {
        if (!this.ctx)
            return;
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        const maxLineLength = Math.floor((110 * this.props.width) / 600);
        let needsTick = false;
        let y = 0;
        let msgList = messages;
        if (isComposing) {
            y = 20;
            const composeTarget = this.props.chatHistory.lastComposeTarget.value;
            if (!(composeTarget.type === ChatRecipientType.Channel &&
                composeTarget.name === RECIPIENT_ALL)) {
                msgList = [
                    {
                        color: "gray",
                        text: this.props.strings.get("TS:ChatCycleHint", "Tab"),
                        animate: false,
                        time: Date.now(),
                    },
                    ...messages,
                ];
            }
        }
        for (const msg of msgList) {
            const animDuration = Math.min(1000, 10 * msg.text.length);
            const animProgress = msg.animate ? Math.min(1, (now - msg.time) / animDuration) : 1;
            let charsToShow = Math.round(animProgress * msg.text.length);
            if (animProgress < 1)
                needsTick = true;
            for (let line of this.wrapText(msg.text, maxLineLength)) {
                if (line.length > charsToShow) {
                    line = line.slice(0, charsToShow);
                    charsToShow = 0;
                }
                else {
                    charsToShow -= line.length;
                }
                y += this.drawLine(line, msg.color, y);
            }
        }
        this.texture.needsUpdate = true;
        if (needsTick)
            this.props.onMessageTick?.();
    }
    drawLine(text: string, color: string, y: number): number {
        return CanvasUtils.drawText(this.ctx, text, 0, y, {
            color,
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 13,
            fontWeight: "500",
            paddingTop: 5,
            height: 20,
            backgroundColor: "rgba(0, 0, 0, .75)",
            paddingLeft: 4,
            paddingRight: 4,
        }).height;
    }
    wrapText(text: string, maxLen: number): string[] {
        const lines: string[] = [];
        while (text.length > maxLen) {
            let idx = text.slice(0, maxLen).search(/\s[^\s]*$/);
            if (idx === -1 || idx === 0)
                idx = Math.min(text.length, maxLen);
            lines.push(text.substr(0, idx));
            text = text.slice(idx);
        }
        if (text.length)
            lines.push(text);
        return lines;
    }
    onDispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}
export default Messages;
