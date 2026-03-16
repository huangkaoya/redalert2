import { MainMenuScreenType } from '../ScreenType';
export class MainMenuRoute {
    screenType: MainMenuScreenType;
    params: any;
    constructor(screenType: MainMenuScreenType, params: any) {
        this.screenType = screenType;
        this.params = params;
    }
}
