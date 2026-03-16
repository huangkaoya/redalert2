import React from "react";
interface ToastsProps {
    messages: string[];
    viewport: {
        x: number;
        y: number;
        width: number;
    };
    zIndex?: number;
}
export const Toasts: React.FC<ToastsProps> = ({ messages, viewport, zIndex }) => {
    return (<div style={{
            position: "absolute",
            top: viewport.x,
            left: viewport.y,
            width: viewport.width,
            zIndex: zIndex,
        }}>
      <div className="toasts">
        {messages.map((msg, idx) => (<div key={idx} className="toast">
            {msg}
          </div>))}
      </div>
    </div>);
};
