export interface JsxRef<T = any> {
    current: T | undefined;
}
export function createRef<T = any>(): JsxRef<T> {
    return { current: undefined };
}
export interface JsxElement {
    isJsxElement: true;
    type: string | Function;
    props: any;
    ref?: JsxRef | ((instance: any) => void);
}
export function jsx(type: string | Function, props?: any, ...children: any[]): JsxElement {
    const { ref, ...restProps } = props || {};
    return {
        isJsxElement: true,
        type,
        props: {
            ...restProps,
            children: children.length > 1 ? children : children[0]
        },
        ref,
    };
}
export interface JsxIntrinsicRenderer {
    (props: any): {
        obj?: any;
        children?: any;
    };
}
export interface JsxIntrinsicRenderers {
    [elementType: string]: JsxIntrinsicRenderer;
}
export function renderJsx(elements: any, intrinsicRenderers: JsxIntrinsicRenderers): any[] {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    return elementsArray
        .map((element) => {
        if (element == null || !element.isJsxElement) {
            return [];
        }
        let obj: any;
        let refTarget: any;
        let children = element.props.children;
        if (typeof element.type === 'string') {
            if (element.type === 'fragment') {
                obj = undefined;
            }
            else {
                const renderer = intrinsicRenderers[element.type];
                if (!renderer) {
                    throw new Error(`No renderer defined for intrinsic JSX element "${element.type}"`);
                }
                const result = renderer({ ref: element.ref, ...element.props });
                obj = result.obj;
                refTarget = obj;
                if (result.children) {
                    children = result.children;
                }
            }
        }
        else {
            const instance = new (element.type as any)(element.props);
            obj = instance.getUiObject();
            children = instance.defineChildren?.() || element.props.children;
            if (instance.onRender && obj.onFrame) {
                obj.onFrame.subscribeOnce((deltaTime: number, source: any) => instance.onRender(deltaTime));
            }
            if (instance.onFrame && obj.onFrame) {
                obj.onFrame.subscribe((deltaTime: number, source: any) => instance.onFrame(deltaTime));
            }
            if (instance.onDispose && obj.onDispose) {
                obj.onDispose.subscribe((_data?: any, _source?: any) => instance.onDispose());
            }
            refTarget = instance;
        }
        const childObjects = children
            ? (Array.isArray(children) ? children : [children])
                .map((child) => renderJsx(child, intrinsicRenderers))
                .reduce((acc, curr) => [...acc, ...curr], [])
            : [];
        if (obj && obj.add) {
            console.log(`[renderJsx] Adding ${childObjects.length} children to parent object:`, obj.constructor.name);
            obj.add(...childObjects);
        }
        else {
            console.log(`[renderJsx] Not adding children - obj:`, obj ? obj.constructor.name : 'null', 'add method:', obj?.add ? 'exists' : 'missing', 'children count:', childObjects.length);
        }
        if (refTarget && element.ref) {
            if (typeof element.ref === 'function') {
                element.ref(refTarget);
            }
            else {
                element.ref.current = refTarget;
            }
        }
        return obj ? [obj] : (obj !== null ? childObjects : []);
    })
        .reduce((acc, curr) => [...acc, ...curr], []);
}
