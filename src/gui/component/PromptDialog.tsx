import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from './Dialog';
export interface PromptDialogProps {
    viewport: any;
    promptText: string;
    submitLabel: string;
    cancelLabel: string;
    inputProps?: any;
    onSubmit: (value: string) => void;
    onDismiss?: () => void;
}
export const PromptDialog: React.FC<PromptDialogProps> = ({ viewport, promptText, submitLabel, cancelLabel, inputProps, onSubmit, onDismiss, }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    }, []);
    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        setHidden(true);
        onSubmit(inputRef.current?.value || '');
    };
    return (<Dialog className="prompt-box" hidden={hidden} viewport={viewport} zIndex={100} buttons={[
            { label: submitLabel, onClick: handleSubmit },
            {
                label: cancelLabel,
                onClick: () => {
                    setHidden(true);
                    onDismiss?.();
                },
            },
        ]}>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="field">
          <label>
            {promptText.split(/\r?\n/).map((line, index) => (<React.Fragment key={index}>
                {index ? <br /> : null}
                {line}
              </React.Fragment>))}
          </label>
          <input name="promptvalue" type="text" autoComplete="off" data-lpignore="true" ref={inputRef} {...inputProps}/>
        </div>
        <button type="submit" style={{ visibility: 'hidden' }}/>
      </form>
    </Dialog>);
};
