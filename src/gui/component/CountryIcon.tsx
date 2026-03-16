import React from 'react';
import { RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME } from '@/game/gameopts/constants';
import { Image } from '@/gui/component/Image';
const countryIcons = new Map<string, string>()
    .set("Americans", "usai.pcx")
    .set("French", "frai.pcx")
    .set("Germans", "geri.pcx")
    .set("British", "gbri.pcx")
    .set("Russians", "rusi.pcx")
    .set("Confederation", "lati.pcx")
    .set("Africans", "djbi.pcx")
    .set("Arabs", "arbi.pcx")
    .set("Alliance", "japi.pcx")
    .set(RANDOM_COUNTRY_NAME, "rani.pcx")
    .set(OBS_COUNTRY_NAME, "obsi.pcx");
interface CountryIconProps {
    country: any;
}
export const CountryIcon: React.FC<CountryIconProps> = ({ country }) => {
    const countryName = typeof country === 'string' ? country : country?.name;
    const iconSrc = countryIcons.get(countryName);
    return (<div className="player-country-icon">
      {iconSrc && <Image src={iconSrc}/>}
    </div>);
};
