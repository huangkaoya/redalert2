import { Select } from "@/gui/component/Select";
import { Option } from "@/gui/component/Option";
import React, { useEffect, useMemo, useState } from "react";
import { BoxedVar } from "@/util/BoxedVar";
import { detectMobileLayout, getCurrentLayoutEnvironment } from "@/gui/viewportLayout";
interface Resolution {
    width: number;
    height: number;
}
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface FullScreen {
    isFullScreen(): boolean;
    onChange?: {
        subscribe: (listener: (value: boolean) => void) => void;
        unsubscribe: (listener: (value: boolean) => void) => void;
    };
}
interface ResolutionSelectProps {
    resolution: BoxedVar<Resolution | undefined>;
    fullScreen: FullScreen;
    strings: Strings;
}
const desktopResolutions: Resolution[] = [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 800, height: 600 },
];
const mobileResolutions: Resolution[] = [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 960, height: 720 },
    { width: 800, height: 600 },
];
const getCurrentScreenSize = (): Resolution => ({
    width: Math.max(320, Math.floor(window.visualViewport?.width ?? window.innerWidth)),
    height: Math.max(240, Math.floor(window.visualViewport?.height ?? window.innerHeight)),
});
const formatResolution = (resolution: Resolution): string => `${resolution.width} x ${resolution.height}`;
const isSameResolution = (left?: Resolution, right?: Resolution) => !!left &&
    !!right &&
    left.width === right.width &&
    left.height === right.height;
export const ResolutionSelect: React.FC<ResolutionSelectProps> = ({ resolution, fullScreen, strings, }) => {
    const [screenSize, setScreenSize] = useState<Resolution>(() => getCurrentScreenSize());
    const [currentResolution, setCurrentResolution] = useState<Resolution | undefined>(resolution.value);
    const [fullScreenMode, setFullScreenMode] = useState(() => fullScreen.isFullScreen());
    const [mobileLayout, setMobileLayout] = useState(() => detectMobileLayout(getCurrentLayoutEnvironment()));
    useEffect(() => {
        const handleResize = () => {
            setScreenSize(getCurrentScreenSize());
            setMobileLayout(detectMobileLayout(getCurrentLayoutEnvironment()));
            setFullScreenMode(fullScreen.isFullScreen());
        };
        const handleFullScreenChange = (value: boolean) => {
            setFullScreenMode(value);
            handleResize();
        };
        window.addEventListener("resize", handleResize);
        window.visualViewport?.addEventListener("resize", handleResize);
        resolution.onChange.subscribe(setCurrentResolution);
        fullScreen.onChange?.subscribe(handleFullScreenChange);
        return () => {
            window.removeEventListener("resize", handleResize);
            window.visualViewport?.removeEventListener("resize", handleResize);
            resolution.onChange.unsubscribe(setCurrentResolution);
            fullScreen.onChange?.unsubscribe(handleFullScreenChange);
        };
    }, [fullScreen, resolution]);
    const availableResolutions = useMemo(() => {
        const baseList = mobileLayout ? mobileResolutions : desktopResolutions;
        const filtered = baseList.filter((entry, index) => (entry.width <= screenSize.width && entry.height <= screenSize.height) ||
            index === baseList.length - 1);
        if (currentResolution && !filtered.some((entry) => isSameResolution(entry, currentResolution))) {
            return [currentResolution, ...filtered];
        }
        return filtered;
    }, [currentResolution, mobileLayout, screenSize.height, screenSize.width]);
    if (fullScreenMode) {
        return (<Select className="resolution-select" initialValue="" disabled={true} onSelect={() => { }}>
        <Option value="" label={strings.get("TS:ResolutionFullScreen", formatResolution(screenSize))}/>
      </Select>);
    }
    return (<Select className="resolution-select" initialValue={currentResolution ? formatResolution(currentResolution) : ""} onSelect={(value) => {
            const nextResolution = value.length
                ? value.split(" x ").map((item) => Number(item))
                : undefined;
            resolution.value = nextResolution
                ? { width: nextResolution[0], height: nextResolution[1] }
                : undefined;
        }}>
      <Option value="" label={strings.get("TS:ResolutionFit", formatResolution(screenSize))}/>
      {availableResolutions.map((entry) => {
            const value = formatResolution(entry);
            return <Option key={value} value={value} label={value}/>;
        })}
    </Select>);
};
