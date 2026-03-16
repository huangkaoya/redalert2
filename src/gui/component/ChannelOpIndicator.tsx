import React from "react";
import { Image } from "./Image";
interface ChannelOpIndicatorProps {
    operator: boolean;
}
const ChannelOpIndicator: React.FC<ChannelOpIndicatorProps> = ({ operator }) => (<div className="channel-op-indicator">
    {operator ? <Image src="woloper.pcx"/> : null}
  </div>);
export default ChannelOpIndicator;
