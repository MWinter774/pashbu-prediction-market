import React from 'react';
import { buttonBaseStyle } from '../BaseButton';

const ResolveButton = ({ onClick }) => {
    return (
        <button
            className={`${buttonBaseStyle} min-w-32 text-xs sm:text-sm md:text-base`}
            onClick={onClick}
        >
            RESOLVE
        </button>
    );
};

const SelectNoButton = ({ onClick, isSelected, label = "NO" }) => {
    return (
        <button
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
                isSelected
                    ? 'bg-pm-no text-white'
                    : 'bg-pm-no/15 text-pm-no hover:bg-pm-no/25'
            }`}
            onClick={onClick}
        >
            RESOLVE {label}
        </button>
    );
};

const SelectYesButton = ({ onClick, isSelected, label = "YES" }) => {
    return (
        <button
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
                isSelected
                    ? 'bg-pm-yes text-white'
                    : 'bg-pm-yes/15 text-pm-yes hover:bg-pm-yes/25'
            }`}
            onClick={onClick}
        >
            RESOLVE {label}
        </button>
    );
};

const ConfirmResolveButton = ({ onClick, selectedResolution, yesLabel = "YES", noLabel = "NO" }) => {
    const getButtonStyle = () => {
        switch (selectedResolution) {
            case 'NO':
                return "bg-pm-no hover:bg-pm-no/80";
            case 'YES':
                return "bg-pm-yes hover:bg-pm-yes/80";
            default:
                return "bg-pm-blue hover:bg-pm-blue-hover";
        }
    };

    const buttonText = () => {
        switch (selectedResolution) {
            case 'NO':
                return `CONFIRM RESOLVE ${noLabel}`;
            case 'YES':
                return `CONFIRM RESOLVE ${yesLabel}`;
            default:
                return "CONFIRM";
        }
    };

    return (
        <button
            className={`w-full py-3 rounded-xl text-base font-bold transition-colors text-white ${getButtonStyle()}`}
            onClick={onClick}
        >
            {buttonText()}
        </button>
    );
};

export { ResolveButton, SelectNoButton, SelectYesButton, ConfirmResolveButton };
