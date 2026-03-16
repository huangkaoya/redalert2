import React, { useState, useEffect } from 'react';
import { CountryIcon } from './CountryIcon';
import { Select } from './Select';
import { Option } from './Option';
interface CountrySelectProps {
    country: string;
    availableCountries: string[];
    onlyIcon?: boolean;
    disabled?: boolean;
    strings: {
        get: (key: string, ...args: any[]) => string;
    };
    countryUiNames: Map<string, string>;
    countryUiTooltips: Map<string, string>;
    onSelect?: (country: string) => void;
}
export const CountrySelect: React.FC<CountrySelectProps> = ({ country, availableCountries, onlyIcon, disabled, strings, countryUiNames, countryUiTooltips, onSelect, }) => {
    const [selectedCountry, setSelectedCountry] = useState(() => country);
    useEffect(() => {
        if (selectedCountry !== country) {
            setSelectedCountry(country);
        }
    }, [country]);
    return (<div className="country-select">
      <div className="player-country-icon" data-r-tooltip={strings.get("STT:HostPictureFlag")}>
        <CountryIcon country={selectedCountry}/>
      </div>
      {!onlyIcon && (<Select className="player-country-select" tooltip={strings.get("STT:HostComboCountry")} initialValue={selectedCountry} disabled={disabled} onSelect={(value) => {
                setSelectedCountry(value);
                onSelect?.(value);
            }}>
          {(disabled ? [selectedCountry] : availableCountries).map((country) => {
                const label = strings.get(countryUiNames.get(country) || country);
                const tooltip = countryUiTooltips.has(country)
                    ? strings.get(countryUiTooltips.get(country)!)
                    : undefined;
                return (<Option key={country} value={country} label={label} tooltip={tooltip}/>);
            })}
        </Select>)}
    </div>);
};
