export interface UiComponentProps {
    [key: string]: any;
}
export class UiComponent<T extends UiComponentProps = UiComponentProps> {
    protected props: T;
    protected uiObject: any;
    constructor(props: T) {
        this.props = props;
        this.uiObject = this.createUiObject(props);
    }
    protected createUiObject(_props?: T): any {
        throw new Error('Method not implemented.');
    }
    getUiObject(): any {
        return this.uiObject;
    }
}
