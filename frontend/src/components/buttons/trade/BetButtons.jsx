import React from 'react';
import { buttonBaseStyle } from '../BaseButton';
import { NumberInput } from '../../inputs/InputBar';

const BetButton = ({ onClick }) => {
    return (
        <button
            className={`${buttonBaseStyle} min-w-32 text-xs sm:text-sm md:text-base`}
            onClick={onClick}
        >
            TRADE
        </button>
    );
};

const BetNoButton = ({ onClick, label = "NO" }) => {
    return (
        <button
            className={`${buttonBaseStyle} bg-red-btn hover:bg-red-btn-hover`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

const BetYesButton = ({ onClick, label = "YES" }) => {
    return (
        <button
            className={`${buttonBaseStyle} bg-green-btn hover:bg-green-btn-hover`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

const BetInputAmount = ({ value, onChange }) => {
    return (
        <NumberInput
            value={value}
            onChange={onChange}
        />
    );
};

const ConfirmBetButton = ({ onClick, selectedDirection, yesLabel = "YES", noLabel = "NO" }) => {
    const getButtonStyle = () => {
        switch (selectedDirection) {
            case 'NO':
                return "bg-red-btn hover:bg-red-btn-hover";
            case 'YES':
                return "bg-green-btn hover:bg-green-btn-hover";
            default:
                return "";
        }
    };

    const buttonText = () => {
        switch (selectedDirection) {
            case 'NO':
                return `CONFIRM PURCHASE OF: ${noLabel}`;
            case 'YES':
                return `CONFIRM PURCHASE OF: ${yesLabel}`;
            default:
                return "CONFIRM PURCHASE";
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

export { BetButton, BetYesButton, BetNoButton, BetInputAmount, ConfirmBetButton };
