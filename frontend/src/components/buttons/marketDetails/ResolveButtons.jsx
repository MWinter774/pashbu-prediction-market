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

const SelectNoButton = ({ onClick, label = "NO" }) => {
    return (
        <button
            className={`${buttonBaseStyle} bg-red-btn hover:bg-red-btn-hover`}
            onClick={onClick}
        >
            RESOLVE {label}
        </button>
    );
};

const SelectYesButton = ({ onClick, label = "YES" }) => {
    return (
        <button
            className={`${buttonBaseStyle} bg-green-btn hover:bg-green-btn-hover`}
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
                return "bg-red-btn hover:bg-red-btn-hover";
            case 'YES':
                return "bg-green-btn hover:bg-green-btn-hover";
            default:
                return "";
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
            className={`${buttonBaseStyle} ${getButtonStyle()}`}
            onClick={onClick}
        >
            {buttonText()}
        </button>
    );
};

export { ResolveButton, SelectNoButton, SelectYesButton, ConfirmResolveButton };
