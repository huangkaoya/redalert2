import React, { useEffect, useState } from "react";
import { Slider } from "@/gui/component/Slider";
import { SCROLL_BASE_FACTOR, GeneralOptions } from "@/gui/screen/options/GeneralOptions";
import { Select } from "@/gui/component/Select";
import { Option } from "@/gui/component/Option";
import { FlyerHelperMode } from "@/engine/renderable/entity/unit/FlyerHelperMode";
import { ModelQuality } from "@/engine/renderable/entity/unit/ModelQuality";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
import { Image } from "@/gui/component/Image";
import { ResolutionSelect } from "@/gui/screen/options/component/Resolution";
interface Strings {
    get(key: string): string;
}
interface FullScreen {
    isAvailable?(): boolean;
    isFullScreen?(): boolean;
    toggle?(): void;
    onChange?: {
        subscribe: (listener: (value: boolean) => void) => void;
        unsubscribe: (listener: (value: boolean) => void) => void;
    };
}
interface LocalPrefs {
    getItem?(key: string): string | undefined;
    setItem?(key: string, value: string): void;
}
interface GeneralOptsProps {
    strings: Strings;
    options: GeneralOptions;
    fullScreen: FullScreen;
    inGame: boolean;
    localPrefs?: LocalPrefs;
}
const speedLabels = new Map([
    [1, "TXT_SLOWEST"],
    [2, "TXT_SLOWER"],
    [3, "TXT_SLOW"],
    [4, "TXT_MEDIUM"],
    [5, "TXT_FAST"],
    [6, "TXT_FASTER"],
    [7, "TXT_FASTEST"],
]);
const isCoarsePointer = () => !!window.matchMedia?.("(pointer: coarse)")?.matches;
const getJoystickPreference = (localPrefs?: LocalPrefs) => {
    const storedValue = localPrefs?.getItem?.("ra2web.mobileJoystickLite.enabled");
    if (storedValue === "0") {
        return false;
    }
    if (storedValue === "1") {
        return true;
    }
    return isCoarsePointer();
};
const performanceOptionItems = [
    {
        key: 'raycastHelperReuse',
        label: 'Raycast Helper Reuse',
    },
    {
        key: 'entityIntersectTraversal',
        label: 'Entity Intersect Traversal',
    },
    {
        key: 'mapTileHitTest',
        label: 'Map Tile Hit Test',
    },
    {
        key: 'worldViewportCache',
        label: 'World Viewport Cache',
    },
    {
        key: 'worldSoundLoopCache',
        label: 'World Sound Loop Cache',
    },
    {
        key: 'telemetry',
        label: 'Telemetry & Benchmarks',
    },
] as const;
export const GeneralOpts: React.FC<GeneralOptsProps> = ({ strings, options, fullScreen, inGame, localPrefs, }) => {
    const [mobileLayout, setMobileLayout] = useState(() => isCoarsePointer());
    const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(() => getJoystickPreference(localPrefs));
    useEffect(() => {
        const handleEnvironmentChange = () => {
            setMobileLayout(isCoarsePointer());
        };
        window.addEventListener("resize", handleEnvironmentChange);
        window.visualViewport?.addEventListener("resize", handleEnvironmentChange);
        return () => {
            window.removeEventListener("resize", handleEnvironmentChange);
            window.visualViewport?.removeEventListener("resize", handleEnvironmentChange);
        };
    }, []);
    return (<div className="opts general-opts">
    <fieldset>
      <legend>{strings.get("TS:GameplayOpts")}</legend>
      <div className="slider-item">
        <span className="label">{strings.get("GUI:ScrollRate")}</span>
        <Slider min={1} max={7} value={String(Math.floor(options.scrollRate.value / SCROLL_BASE_FACTOR))} getLabel={(value) => strings.get(speedLabels.get(Number(value))!)} onChange={(e) => (options.scrollRate.value =
            Number(e.target.value) * SCROLL_BASE_FACTOR)}/>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:MouseAccel")}>
        <label>
          <span className="label">{strings.get("TS:MouseAccel")}</span>
          <Select initialValue={String(Number(options.mouseAcceleration.value))} onSelect={(value) => (options.mouseAcceleration.value = Boolean(Number(value)))}>
            <Option value="1" label={strings.get("TXT_ON")}/>
            <Option value="0" label={strings.get("TXT_OFF")}/>
          </Select>
          <span className="info" title={strings.get("TS:MouseAccelHint")}>
            <Image src="info.png"/>
          </span>
        </label>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:AttackMoveButton")}>
        <label>
          <span className="label">{strings.get("TS:AttackMoveButton")}</span>
          <Select initialValue={String(Number(options.rightClickMove.value))} onSelect={(value) => (options.rightClickMove.value = Boolean(Number(value)))}>
            <Option value="0" label={strings.get("TS:AttackMoveButtonLeft")}/>
            <Option value="1" label={strings.get("TS:AttackMoveButtonRight")}/>
          </Select>
        </label>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:RightClickScroll")}>
        <label>
          <span className="label">{strings.get("TS:RightClickScroll")}</span>
          <Select initialValue={String(Number(options.rightClickScroll.value))} onSelect={(value) => (options.rightClickScroll.value = Boolean(Number(value)))}>
            <Option value="1" label={strings.get("TXT_ON")}/>
            <Option value="0" label={strings.get("TXT_OFF")}/>
          </Select>
        </label>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:FlyerLabel")}>
        <span className="label">{strings.get("TS:FlyerLabel")}</span>
        <Select initialValue={String(options.flyerHelper.value)} onSelect={(value) => (options.flyerHelper.value = Number(value) as FlyerHelperMode)}>
          <Option value={String(FlyerHelperMode.Always)} label={strings.get("TS:FlyerAlways")}/>
          <Option value={String(FlyerHelperMode.Selected)} label={strings.get("TS:FlyerSelected")}/>
          <Option value={String(FlyerHelperMode.Never)} label={strings.get("TS:FlyerNever")}/>
        </Select>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:IGGameOptCBoxHidden")}>
        <label>
          <span className="label">{strings.get("GUI:ShowHidden")}</span>
          <input type="checkbox" defaultChecked={options.hiddenObjects.value} onChange={(e) => (options.hiddenObjects.value = e.target.checked)}/>
        </label>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:IGGameOptCBoxTargetLines")}>
        <label>
          <span className="label">{strings.get("GUI:TargetLines")}</span>
          <input type="checkbox" defaultChecked={options.targetLines.value} onChange={(e) => (options.targetLines.value = e.target.checked)}/>
        </label>
      </div>
      {mobileLayout && (<div className="item">
          <label>
            <span className="label">摇杆</span>
            <input type="checkbox" checked={mobileJoystickEnabled} onChange={(event) => {
                const enabled = event.target.checked;
                const globalWindow = window as any;
                setMobileJoystickEnabled(enabled);
                localPrefs?.setItem?.("ra2web.mobileJoystickLite.enabled", enabled ? "1" : "0");
                document.documentElement.dataset.ra2JoystickLite = enabled ? "1" : "0";
                globalWindow.__ra2webVirtualJoystickLite?.setEnabled?.(enabled, false);
            }}/>
          </label>
        </div>)}
    </fieldset>
    <fieldset>
      <legend>{strings.get("TS:GfxOpts")}</legend>
      <div className="item">
        <span className="label">{strings.get("TS:Resolution")}</span>
        <ResolutionSelect resolution={options.graphics.resolution} fullScreen={fullScreen as any} strings={strings}/>
        <span className="info" title={strings.get("TS:ResolutionHint")}>
          <Image src="info.png"/>
        </span>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:GfxModels")}>
        <span className="label">{strings.get("TS:GfxModels")}</span>
        <Select disabled={inGame} initialValue={String(options.graphics.models.value)} onSelect={(value) => (options.graphics.models.value = Number(value) as ModelQuality)}>
          <Option value={String(ModelQuality.High)} label={strings.get("TS:GfxQualityHigh")}/>
          <Option value={String(ModelQuality.Low)} label={strings.get("TS:GfxQualityLow")}/>
        </Select>
      </div>
      <div className="item" data-r-tooltip={strings.get("STT:GfxShadows")}>
        <span className="label">{strings.get("TS:GfxShadows")}</span>
        <Select initialValue={String(options.graphics.shadows.value)} onSelect={(value) => (options.graphics.shadows.value = Number(value) as ShadowQuality)}>
          <Option value={String(ShadowQuality.High)} label={strings.get("TS:GfxQualityHigh")}/>
          <Option value={String(ShadowQuality.Medium)} label={strings.get("TS:GfxQualityMed")}/>
          <Option value={String(ShadowQuality.Low)} label={strings.get("TS:GfxQualityLow")}/>
          <Option value={String(ShadowQuality.Off)} label={strings.get("TS:GfxQualityOff")}/>
        </Select>
      </div>
    </fieldset>
    <fieldset>
      <legend>Performance</legend>
      {performanceOptionItems.map((item) => (<div className="item" key={item.key}>
          <label>
            <span className="label">{item.label}</span>
            <input type="checkbox" defaultChecked={options.performance[item.key].value} onChange={(event) => (options.performance[item.key].value = event.target.checked)}/>
          </label>
        </div>))}
    </fieldset>
  </div>);
};
