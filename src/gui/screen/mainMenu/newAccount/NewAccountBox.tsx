import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { MIN_USERNAME_LEN, MAX_USERNAME_LEN, MAX_PASS_LEN } from "@/network/WolConfig";
interface Region {
    id: string;
    label: string;
    available: boolean;
}
interface NewAccountFormData {
    user: string;
    pass: string;
    passMatch: boolean;
    regionId: string;
}
interface NewAccountBoxProps {
    regions: Region[];
    initialRegion: Region;
    strings: any;
    onRegionChange: (regionId: string) => void;
    onSubmit: (formData: NewAccountFormData) => void;
}
interface NewAccountBoxRef {
    submit(): void;
}
export const NewAccountBox = forwardRef<NewAccountBoxRef, NewAccountBoxProps>(({ regions, initialRegion, strings, onRegionChange, onSubmit }, ref) => {
    const [selectedRegionId, setSelectedRegionId] = useState(initialRegion.id);
    const formRef = useRef<HTMLFormElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        setTimeout(() => usernameRef.current?.focus(), 50);
    }, []);
    const handleSubmit = () => {
        if (!usernameRef.current || !passwordRef.current || !confirmPasswordRef.current)
            return;
        const formData: NewAccountFormData = {
            user: usernameRef.current.value,
            pass: passwordRef.current.value,
            passMatch: passwordRef.current.value === confirmPasswordRef.current.value,
            regionId: selectedRegionId,
        };
        onSubmit(formData);
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
    return React.createElement("div", { className: "login-wrapper new-account-box" }, React.createElement("div", { className: "title" }, strings.get("GUI:NewAccount")), React.createElement("form", {
        onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            handleSubmit();
        },
        className: "login-form login-box",
        ref: formRef,
    }, regions.length > 1
        ? React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("TS:Region")), React.createElement("select", {
            name: "server",
            value: selectedRegionId,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                const regionId = e.target.value;
                setSelectedRegionId(regionId);
                onRegionChange(regionId);
            },
        }, regions.map((region) => React.createElement("option", { value: region.id, key: region.id, disabled: !region.available }, region.label))))
        : React.createElement("input", {
            type: "hidden",
            name: "server",
            value: selectedRegionId,
        }), React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("GUI:Nickname")), React.createElement("input", {
        name: "user",
        type: "text",
        required: true,
        minLength: MIN_USERNAME_LEN,
        maxLength: MAX_USERNAME_LEN,
        pattern: "[a-zA-Z0-9_\\-]+",
        ref: usernameRef,
    })), React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("GUI:Password")), React.createElement("input", {
        name: "pass",
        type: "password",
        required: true,
        maxLength: MAX_PASS_LEN,
        ref: passwordRef,
    })), React.createElement("div", { className: "field" }, React.createElement("label", null, strings.get("GUI:PasswordConfirm")), React.createElement("input", {
        name: "passConfirm",
        type: "password",
        required: true,
        maxLength: MAX_PASS_LEN,
        ref: confirmPasswordRef,
    })), React.createElement("button", {
        type: "submit",
        style: { visibility: "hidden" },
    })));
});
