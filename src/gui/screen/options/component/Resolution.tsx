import { Select } from "@/gui/component/Select";
import { Option } from "@/gui/component/Option";
import React, { useState, useEffect } from "react";
import { BoxedVar } from "@/util/BoxedVar";
interface Resolution {
    width: number;
    height: number;
}
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface FullScreen {
    isFullScreen(): boolean;
}
interface ResolutionSelectProps {
    resolution: BoxedVar<Resolution | undefined>;
    fullScreen: FullScreen;
    strings: Strings;
}
const availableResolutions: Resolution[] = [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1280, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 800, height: 600 },
];
export const ResolutionSelect: React.FC<ResolutionSelectProps> = ({ resolution, fullScreen, strings, }) => {
    const formatResolution = (res: Resolution): string => `${res.width} x ${res.height}`;
    const getCurrentScreenSize = (): Resolution => ({
        width: Math.max(availableResolutions[availableResolutions.length - 1].width, window.innerWidth),
        height: Math.max(availableResolutions[availableResolutions.length - 1].height, window.innerHeight),
    });
    const getFilteredResolutions = (screenSize: Resolution): Resolution[] => availableResolutions.filter((res, index) => (res.height <= screenSize.height && res.width <= screenSize.width) ||
        index === availableResolutions.length - 1);
    const [screenSize, setScreenSize] = useState<Resolution>(() => getCurrentScreenSize());
    const [currentResolution, setCurrentResolution] = useState<Resolution | undefined>(resolution.value);
    const [filteredResolutions, setFilteredResolutions] = useState<Resolution[]>(() => getFilteredResolutions(screenSize));
    const isFullScreenMode = fullScreen.isFullScreen();
    const isCustomResolution = currentResolution &&
        !filteredResolutions.find((res) => res.height === currentResolution.height && res.width === currentResolution.width);
    useEffect(() => {
        const handleResize = () => {
            const newScreenSize = getCurrentScreenSize();
            setScreenSize(newScreenSize);
            setFilteredResolutions(getFilteredResolutions(newScreenSize));
        };
        const unsubscribe = () => {
            resolution.onChange.unsubscribe(setCurrentResolution);
        };
        window.addEventListener("resize", handleResize);
        resolution.onChange.subscribe(setCurrentResolution);
        return () => {
            window.removeEventListener("resize", handleResize);
            unsubscribe();
        };
    }, [resolution]);
    if (isFullScreenMode) {
        return (<Select className="resolution-select" initialValue="" disabled={true} onSelect={() => { }}>
        <Option value="" label={strings.get("TS:ResolutionFullScreen", formatResolution(screenSize))}/>
      </Select>);
    }
    return (<Select className="resolution-select" initialValue={currentResolution ? formatResolution(currentResolution) : ""} onSelect={(value) => {
            const parsedResolution = value !== ""
                ? value.split(" x ").map((v) => Number(v))
                : undefined;
            const newResolution = parsedResolution
                ? { width: parsedResolution[0], height: parsedResolution[1] }
                : undefined;
            resolution.value = newResolution;
        }}>
      {isCustomResolution && currentResolution && (<Option value={formatResolution(currentResolution)} label={`${formatResolution(currentResolution)} (${formatResolution({
                width: Math.min(currentResolution.width, screenSize.width),
                height: Math.min(currentResolution.height, screenSize.height),
            })})`}/>)}
      <Option value="" label={strings.get("TS:ResolutionFit", formatResolution(screenSize))}/>
      {filteredResolutions.map((res) => {
            const resolutionString = formatResolution(res);
            return (<Option key={resolutionString} value={resolutionString} label={resolutionString}/>);
        })}
    </Select>);
};
