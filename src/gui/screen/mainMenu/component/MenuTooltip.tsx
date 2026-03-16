import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
interface MenuTooltipProps {
    monitorContainer: {
        getElement(): HTMLElement;
    };
}
export const MenuTooltip: React.FC<MenuTooltipProps> = ({ monitorContainer }) => {
    const [tooltipText, setTooltipText] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);
    useEffect(() => {
        let element = monitorContainer.getElement();
        let lastTarget: EventTarget | null = null;
        const handleMouseEvent = (event: MouseEvent) => {
            let target = event.target as HTMLElement;
            if (target !== lastTarget) {
                lastTarget = target;
                let tooltip = target.getAttribute?.("data-r-tooltip");
                while (target && target !== element && !tooltip) {
                    target = target.parentElement as HTMLElement;
                    tooltip = target.getAttribute("data-r-tooltip");
                }
                setTooltipText(tooltip || "");
            }
        };
        element.addEventListener("mousemove", handleMouseEvent);
        element.addEventListener("mouseleave", handleMouseEvent);
        return () => {
            element.removeEventListener("mousemove", handleMouseEvent);
            element.removeEventListener("mouseleave", handleMouseEvent);
        };
    }, []);
    useEffect(() => {
        setIsAnimating(false);
        const timeout = setTimeout(() => setIsAnimating(true), 10);
        return () => clearTimeout(timeout);
    }, [tooltipText]);
    return (<div className={classNames("menu-tooltip", { anim: isAnimating })}>
      {tooltipText}
    </div>);
};
