import { ChannelType } from '@/engine/sound/ChannelType';
import { pad } from '@/util/string';
export class TauntPlayback {
    private static readonly COUNTRY_CODES = new Map([
        ['Americans', 'am'],
        ['French', 'fr'],
        ['Germans', 'ge'],
        ['British', 'br'],
        ['Russians', 'ru'],
        ['Confederation', 'cu'],
        ['Africans', 'li'],
        ['Arabs', 'ir'],
        ['Alliance', 'ko'],
    ]);
    constructor(private audioSystem: any, private taunts: any) { }
    async playTaunt(player: any, tauntNumber: number): Promise<void> {
        const fileName = this.getTauntFileName(player.country.name, tauntNumber);
        const tauntFile = await this.taunts.get(fileName);
        if (tauntFile) {
            this.audioSystem.playWavFile(tauntFile, ChannelType.Voice);
        }
        else {
            console.warn(`Taunt file "${fileName}" not found.`);
        }
    }
    private getTauntFileName(countryName: string, tauntNumber: number): string {
        const countryCode = TauntPlayback.COUNTRY_CODES.get(countryName);
        return `tau${countryCode}${pad(tauntNumber, '00')}.wav`;
    }
}
