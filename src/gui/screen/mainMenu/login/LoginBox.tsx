import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { ServerList } from "@/gui/screen/mainMenu/login/ServerList";
import { Task } from "@puzzl/core/lib/async/Task";
import { HttpRequest } from "@/network/HttpRequest";
import { MIN_USERNAME_LEN, MAX_USERNAME_LEN, MAX_PASS_LEN } from "@/network/WolConfig";
interface LoginBoxProps {
    regions: any[];
    selectedRegion: any;
    selectedUser: string;
    pings: any[];
    breakingNewsUrl?: string;
    strings: any;
    onRegionChange: (region: any) => void;
    onRequestRegionRefresh: () => void;
    onSubmit: (username: string, password: string) => void;
}
interface LoginBoxRef {
    submit(): void;
}
export const LoginBox = forwardRef<LoginBoxRef, LoginBoxProps>(({ regions, selectedRegion, selectedUser, pings, breakingNewsUrl, strings, onRegionChange, onRequestRegionRefresh, onSubmit, }, ref) => {
    const formRef = useRef<HTMLFormElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [breakingNews, setBreakingNews] = useState<string>();
    useEffect(() => {
        setTimeout(() => usernameRef.current?.focus(), 50);
    }, []);
    useEffect(() => {
        if (breakingNewsUrl) {
            const task = new Task(async (cancellationToken) => {
                const html = await new HttpRequest().fetchHtml(breakingNewsUrl, cancellationToken);
                const trimmedHtml = html.trim();
                if (trimmedHtml.length) {
                    setBreakingNews(trimmedHtml);
                }
            });
            task.start().catch((error) => console.error(error));
            return () => task.cancel();
        }
    }, [breakingNewsUrl]);
    const handleSubmit = () => {
        if (usernameRef.current && passwordRef.current) {
            onSubmit(usernameRef.current.value, passwordRef.current.value);
        }
    };
    useImperativeHandle(ref, () => ({
        submit() {
            if (formRef.current?.requestSubmit) {
                formRef.current.requestSubmit();
            }
            else {
                handleSubmit();
            }
        },
    }));
    return React.createElement("div", { className: "login-wrapper" }, React.createElement("div", { className: "title" }, strings.get("GUI:Login")), React.createElement("form", {
        onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            handleSubmit();
        },
        className: "login-form login-box",
        ref: formRef,
    }, React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("TS:Region")), selectedUser && selectedRegion
        ? React.createElement("input", {
            type: "text",
            value: selectedRegion.label,
            readOnly: true,
        })
        : React.createElement(React.Fragment, null, React.createElement(ServerList, {
            regionId: selectedRegion?.id,
            regions: regions,
            pings: pings,
            strings: strings,
            onChange: (region: any) => {
                onRegionChange(region);
            },
        }), React.createElement("button", {
            type: "button",
            className: "icon-button refresh-button",
            onClick: onRequestRegionRefresh,
        }))), React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("GUI:Nickname")), React.createElement("input", {
        name: "user",
        type: "text",
        required: true,
        minLength: MIN_USERNAME_LEN,
        maxLength: MAX_USERNAME_LEN,
        pattern: "[a-zA-Z0-9_\\-]+",
        ref: usernameRef,
        defaultValue: selectedUser,
        readOnly: !!selectedUser,
    })), React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("GUI:Password")), React.createElement("input", {
        name: "pass",
        type: "password",
        required: true,
        maxLength: MAX_PASS_LEN,
        ref: passwordRef,
    })), React.createElement("button", {
        type: "submit",
        style: { visibility: "hidden" },
    })), breakingNews &&
        React.createElement("fieldset", { className: "news" }, React.createElement("legend", null, strings.get("GUI:BreakingNews")), React.createElement("div", {
            dangerouslySetInnerHTML: { __html: breakingNews },
        })));
});
