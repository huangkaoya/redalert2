import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { Select } from './Select';
import { Option } from './Option';
interface ColorSelectProps {
    color?: string;
    disabled?: boolean;
    availableColors: string[];
    onSelect?: (color: string) => void;
    strings: {
        get: (key: string, ...args: any[]) => string;
    };
}
export const ColorSelect: React.FC<ColorSelectProps> = ({ color, disabled, availableColors, onSelect, strings, }) => {
    const [selectedColor, setSelectedColor] = useState(() => color);
    useEffect(() => {
        if (selectedColor !== color) {
            setSelectedColor(color);
        }
    }, [color]);
    return (<Select className={classNames('player-color-select', {
            'bg-color': !!selectedColor,
        })} tooltip={strings.get("STT:HostComboColor")} initialValue={selectedColor || "random"} disabled={disabled} labelStyle={(value) => ({
            backgroundColor: value !== "random" ? value : "transparent",
        })} onSelect={(value) => {
            const newColor = value === "random" ? "" : value;
            setSelectedColor(newColor);
            onSelect?.(newColor);
        }}>
      {(disabled ? [selectedColor] : availableColors).map((color) => (<Option key={color} value={color || "random"} label={color ? "" : strings.get("GUI:RandomAsSymbols")} className={classNames({ 'bg-color': !!color })}/>))}
    </Select>);
};
