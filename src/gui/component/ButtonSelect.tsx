import React, { useState, useRef, useEffect, ReactNode, ReactElement, CSSProperties } from "react";
import classNames from "classnames";
interface ButtonSelectProps {
    initialValue: any;
    disabled?: boolean;
    tooltip?: string;
    className?: string;
    onSelect: (value: any) => void;
    labelStyle?: (value: any) => CSSProperties;
    children: ReactNode;
}
const ButtonSelect: React.FC<ButtonSelectProps> = ({ initialValue, disabled, tooltip, className, onSelect, labelStyle, children, }) => {
    const [selected, setSelected] = useState(() => initialValue);
    const [hovered, setHovered] = useState(() => initialValue);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (selected !== initialValue) {
            setSelected(initialValue);
            setHovered(initialValue);
        }
    }, [initialValue]);
    useEffect(() => {
        setHovered(selected);
    }, []);
    return (<div className={classNames("button-select", { disabled }, className)} data-r-tooltip={tooltip} ref={ref}>
      {React.Children.map(children, (child) => {
            if (!child)
                return null;
            const element = child as ReactElement<any>;
            const value = element.props.value;
            const childDisabled = element.props.disabled;
            return (<div onMouseEnter={() => !childDisabled && setHovered(value)} onMouseLeave={() => hovered === value && setHovered(undefined)}>
            {React.cloneElement(element, {
                    selected: value === selected || value === hovered,
                    disabled: childDisabled || disabled,
                    labelStyle: labelStyle?.(value),
                    onClick: () => {
                        setSelected(value);
                        setHovered(value);
                        onSelect(value);
                    },
                })}
          </div>);
        })}
    </div>);
};
export default ButtonSelect;
