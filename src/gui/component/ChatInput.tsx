import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { RECIPIENT_TEAM, RECIPIENT_ALL } from '@/network/gservConfig';
const IMPLICIT_CHANNEL_NAME = '';
interface ChatInputProps {
    chatHistory?: {
        lastComposeTarget?: {
            value: {
                type: ChatRecipientType;
                name: string;
            };
            onChange?: {
                subscribe: (callback: (value: any) => void) => void;
                unsubscribe: (callback: (value: any) => void) => void;
            };
        };
        lastWhisperFrom?: {
            value: string;
            onChange?: {
                subscribe: (callback: () => void) => void;
                unsubscribe: (callback: () => void) => void;
            };
        };
        lastWhisperTo?: {
            value: string;
            onChange?: {
                subscribe: (callback: () => void) => void;
                unsubscribe: (callback: () => void) => void;
            };
        };
    };
    channels?: string[];
    strings: {
        get: (key: string, ...args: any[]) => string;
    };
    className?: string;
    tooltip?: string;
    forceColor?: string;
    noCycleHint?: boolean;
    submitEmpty?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onKeyUp?: (e: React.KeyboardEvent) => void;
    onBlur?: () => void;
    onCancel?: (isEmpty: boolean) => void;
    onSubmit: (data: {
        recipient: {
            type: ChatRecipientType;
            name: string;
        };
        value: string;
    }) => void;
}
export const ChatInput = forwardRef<{
    send: () => void;
}, ChatInputProps>(({ chatHistory: s, channels: r = [], strings: t, className: e, tooltip: i, forceColor: a, noCycleHint: n, submitEmpty: o, onKeyDown: l, onKeyUp: c, onBlur: h, onCancel: u, onSubmit: d, }, g) => {
    const p = useRef<HTMLInputElement>(null);
    const [m, f] = useState(() => M());
    const [y, T] = useState(() => {
        const e = s?.lastComposeTarget?.value;
        return A(e) ? e : { type: ChatRecipientType.Channel, name: r[0] ?? IMPLICIT_CHANNEL_NAME };
    });
    const [v, b] = useState<string>();
    const [S, w] = useState<string>();
    const [C, E] = useState(false);
    const [x, O] = useState(false);
    function M() {
        const e = (r.length ? r : [IMPLICIT_CHANNEL_NAME]).map((e) => ({
            type: ChatRecipientType.Channel,
            name: e,
        }));
        let t: string | undefined, i: string | undefined;
        if (s) {
            t = s.lastWhisperFrom?.value;
            i = s.lastWhisperTo?.value;
            if (t)
                e.push({ type: ChatRecipientType.Whisper, name: t });
            if (i && i !== t)
                e.push({ type: ChatRecipientType.Whisper, name: i });
        }
        return e;
    }
    function A(e: {
        type: ChatRecipientType;
        name: string;
    } | undefined) {
        return e && (e.type !== ChatRecipientType.Channel || r.includes(e.name));
    }
    function R(e: {
        type: ChatRecipientType;
        name: string;
    }) {
        if (s?.lastComposeTarget)
            s.lastComposeTarget.value = e;
        T(e);
    }
    useEffect(() => {
        p.current?.focus();
    }, []);
    useEffect(() => {
        if (!A(y)) {
            T({ type: ChatRecipientType.Channel, name: r[0] ?? IMPLICIT_CHANNEL_NAME });
        }
    }, [r]);
    useEffect(() => {
        if (s) {
            const e = (e: any) => {
                if (y !== e && A(e)) {
                    T(e);
                    p.current?.focus();
                }
            };
            const t = () => {
                f(M());
            };
            s.lastComposeTarget?.onChange.subscribe(e);
            s.lastWhisperFrom?.onChange.subscribe(t);
            s.lastWhisperTo?.onChange.subscribe(t);
            return () => {
                s.lastComposeTarget?.onChange.unsubscribe(e);
                s.lastWhisperFrom?.onChange.unsubscribe(t);
                s.lastWhisperTo?.onChange.unsubscribe(t);
            };
        }
    }, [y, s, r]);
    useImperativeHandle(g, () => ({
        send() {
            const e = p.current;
            if (!e)
                return;
            const t = e.value;
            if (t.length) {
                d({ recipient: y, value: t });
                e.value = '';
                e.focus();
                w(t);
            }
        },
    }), [y]);
    const P = (function (e: {
        type: ChatRecipientType;
        name: string;
    }) {
        if (e.type === ChatRecipientType.Channel) {
            if (e.name === RECIPIENT_TEAM)
                return t.get("TS:ToAllies");
            if (e.name === RECIPIENT_ALL)
                return t.get("TS:ToAll");
            return '';
        }
        if (e.type === ChatRecipientType.Whisper) {
            return t.get("TS:To", e.name);
        }
        throw new Error(`Recipient type ${e.type} not implemented`);
    })(y);
    const I = !n && C && !x && (m.length > 1 || y.type === ChatRecipientType.Whisper)
        ? t.get("TS:ChatCycleHint", "Tab")
        : undefined;
    return (<div className={e}>
      {P && <label style={{ color: a }}>{P}</label>}
      <input type="text" autoComplete="off" spellCheck={false} ref={p} maxLength={128} data-r-tooltip={i} placeholder={I} style={{ color: a }} onKeyDown={(e) => {
            if (e.key === "Tab")
                e.preventDefault();
            if (!e.repeat)
                b(e.key);
            l?.(e);
        }} onKeyUp={(e) => {
            const t = e.target as HTMLInputElement;
            if (e.key === "Enter" && v === "Enter") {
                const i = t.value;
                if (i.length || o) {
                    d({ recipient: y, value: i });
                    if (i.length) {
                        t.value = '';
                        w(i);
                    }
                }
            }
            else if (e.key === "Tab" && v === "Tab") {
                if (m.length !== 1 || m[0].name !== y.name) {
                    let e = m.findIndex((e) => e.type === y.type && e.name === y.name);
                    e = e === -1 ? 0 : (e + 1) % m.length;
                    const i = m[e];
                    O(true);
                    R(i);
                }
            }
            else if (e.key === "ArrowUp" && S) {
                t.value = S;
            }
            else if (e.key === "Escape" && v !== "Process") {
                u?.(t.value.length === 0);
                t.value = '';
            }
            c?.(e);
        }} onChange={(e) => {
            const t = e.target.value;
            const i = t.match(/^\/(?:page|whisper|w|msg|m) ([A-Za-z0-9-_']+) /i);
            if (i) {
                R({ type: ChatRecipientType.Whisper, name: i[1] });
                e.target.value = '';
            }
            const r = t.match(/^\/r(eply)? /i);
            if (r) {
                if (s?.lastWhisperFrom.value !== undefined) {
                    R({
                        type: ChatRecipientType.Whisper,
                        name: s.lastWhisperFrom.value,
                    });
                }
                e.target.value = '';
            }
            if (!i && !r && I !== undefined) {
                O(true);
            }
        }} onFocus={() => E(true)} onBlur={() => {
            E(false);
            h?.();
        }}/>
    </div>);
});
