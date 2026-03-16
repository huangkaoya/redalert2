import { EventDispatcher, EventListener } from './event';
export class BoxedVar<T> {
    private _value: T;
    private readonly _onChange: EventDispatcher<BoxedVar<T>, T>;
    constructor(initialValue: T) {
        this._onChange = new EventDispatcher<BoxedVar<T>, T>();
        this._value = initialValue;
    }
    get value(): T {
        return this._value;
    }
    set value(newValue: T) {
        const hasChanged = newValue !== this._value;
        this._value = newValue;
        if (hasChanged) {
            this._onChange.dispatch(this, newValue);
        }
    }
    get onChange(): {
        subscribe: (listener: EventListener<BoxedVar<T>, T>) => void;
        subscribeOnce: (listener: EventListener<BoxedVar<T>, T>) => void;
        unsubscribe: (listener: EventListener<BoxedVar<T>, T>) => void;
    } {
        return this._onChange.asEvent();
    }
}
