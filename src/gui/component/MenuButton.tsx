import React from "react";
interface ButtonConfig {
    label: string;
    disabled?: boolean;
    tooltip?: string;
}
interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface MenuButtonProps {
    buttonConfig: ButtonConfig;
    box: Box;
    onMouseDown?: (event: React.MouseEvent) => void;
    onMouseUp?: (event: React.MouseEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
}
export class MenuButton extends React.Component<MenuButtonProps> {
    render() {
        const { buttonConfig } = this.props;
        if (!buttonConfig) {
            return null;
        }
        return React.createElement("div", {
            className: this.getClassName(buttonConfig),
            style: this.getStyle(),
            onMouseDown: (event) => this.onMouseDown(event),
            onMouseUp: (event) => this.onMouseUp(event),
            onClick: (event) => this.onClick(event),
            "data-r-tooltip": buttonConfig.tooltip,
        }, buttonConfig.label);
    }
    getClassName(buttonConfig: ButtonConfig): string {
        let classes = ["menu-button"];
        if (buttonConfig.disabled) {
            classes.push("disabled");
        }
        return classes.join(" ");
    }
    getStyle(): React.CSSProperties {
        const { box } = this.props;
        return {
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            lineHeight: box.height + 1 + "px",
        };
    }
    onMouseDown(event: React.MouseEvent): void {
        if (!this.props.buttonConfig.disabled && this.props.onMouseDown) {
            this.props.onMouseDown(event);
        }
    }
    onMouseUp(event: React.MouseEvent): void {
        if (!this.props.buttonConfig.disabled && this.props.onMouseUp) {
            this.props.onMouseUp(event);
        }
    }
    onClick(event: React.MouseEvent): void {
        if (!this.props.buttonConfig.disabled && this.props.onClick) {
            this.props.onClick(event);
        }
    }
}
