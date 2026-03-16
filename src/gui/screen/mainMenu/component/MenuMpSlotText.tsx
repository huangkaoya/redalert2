import React from 'react';
import { Image } from '../../../component/Image';
interface MenuMpSlotTextProps {
    text: string;
    icon?: string;
    tooltip?: string;
}
export const MenuMpSlotText: React.FC<MenuMpSlotTextProps> = ({ text, icon, tooltip }) => {
    return (<div className="menu-mp-slot">
      <pre className="menu-mp-slot-text">{text}</pre>
      {icon && (<div className="menu-mp-slot-icon" data-r-tooltip={tooltip}>
          <Image src={icon}/>
        </div>)}
    </div>);
};
