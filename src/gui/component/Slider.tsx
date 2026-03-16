import React, { useState, useEffect } from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  getLabel?: (value: string | number) => string | number;
}

export const Slider: React.FC<SliderProps> = ({ getLabel, ...props }) => {
  const [value, setValue] = useState(() => props.value);
  const normalizedValue = Array.isArray(value) ? value[0] ?? '' : value ?? '';

  useEffect(() => {
    if (value !== props.value) {
      setValue(props.value);
    }
  }, [props.value]);

  return (
    <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <input
        type="range"
        {...props}
        value={normalizedValue}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e);
        }}
      />
      <input
        type="text"
        disabled={true}
        readOnly={true}
        value={getLabel?.(normalizedValue) ?? normalizedValue}
      />
    </div>
  );
};
