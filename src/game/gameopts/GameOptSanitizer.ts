import { clamp } from "@/util/math";
export class GameOptSanitizer {
    static sanitize(gameOpts: any, rules: any): void {
        const mpDialogSettings = rules.mpDialogSettings;
        gameOpts.credits = Math.floor(clamp(gameOpts.credits, mpDialogSettings.minMoney, mpDialogSettings.maxMoney));
        gameOpts.gameSpeed = Math.floor(clamp(gameOpts.gameSpeed, 0, 6));
        gameOpts.unitCount = Math.floor(clamp(gameOpts.unitCount, mpDialogSettings.minUnitCount, mpDialogSettings.maxUnitCount));
    }
}
