import { UiComponent } from './UiComponent';
import { UiObject } from '../UiObject';
import { HtmlReactElement } from '../HtmlReactElement';
import * as THREE from 'three';
export class HtmlView extends UiComponent {
    createUiObject(props: any): UiObject {
        const htmlElement = HtmlReactElement.factory(this.props.component, this.props.props || {});
        htmlElement.setSize(props.width || 0, props.height || 0);
        const uiObject = new UiObject(new THREE.Object3D(), htmlElement);
        uiObject.setPosition(props.x || 0, props.y || 0);
        if (props.hidden) {
            uiObject.setVisible(false);
        }
        this.props.innerRef?.(htmlElement);
        return uiObject;
    }
    getElement(): HtmlReactElement<any> | undefined {
        return this.getUiObject().getHtmlContainer() as HtmlReactElement<any>;
    }
}
