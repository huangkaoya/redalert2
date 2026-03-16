import { CommandBarButtonType } from "./CommandBarButtonType";
export class CommandBarButtonList {
    buttons: CommandBarButtonType[] = [];
    fromIni(iniSection: {
        getString: (key: string) => string | undefined;
    }): this {
        const buttonListStr = iniSection.getString("ButtonList") ?? "";
        const buttonNames = buttonListStr.split(",").map(s => s.trim()).filter(Boolean);
        const validButtonNames = new Set(Object.keys(CommandBarButtonType).filter(key => isNaN(Number(key))));
        const result: CommandBarButtonType[] = [];
        for (const name of buttonNames) {
            if (name === "x") {
                result.push(CommandBarButtonType.Separator);
            }
            else if (validButtonNames.has(name)) {
                const buttonType = CommandBarButtonType[name as keyof typeof CommandBarButtonType];
                if (typeof buttonType === "number") {
                    result.push(buttonType);
                }
            }
            else {
                console.warn(`Unknown command bar button type "${name}"`);
            }
        }
        this.buttons = result;
        return this;
    }
}
