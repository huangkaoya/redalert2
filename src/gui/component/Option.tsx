import React from 'react';
import classNames from 'classnames';
interface OptionProps {
    selected?: boolean;
    disabled?: boolean;
    value?: string | number;
    label: string;
    style?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
    className?: string;
    tooltip?: string;
    onClick?: () => void;
}
export const Option: React.FC<OptionProps> = ({ selected, disabled, value, label, style, labelStyle, className, tooltip, onClick, }) => (<div className={classNames('option', { selected, disabled }, className)} style={style} onClick={disabled ? undefined : onClick} data-r-tooltip={tooltip}>
    <div style={labelStyle}>{label}</div>
  </div>);
