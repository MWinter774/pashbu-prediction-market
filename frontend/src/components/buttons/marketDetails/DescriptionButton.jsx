import React from 'react';
import { buttonBaseStyle } from '../BaseButton';

const DescriptionButton = ({ onClick, children }) => {
    return (
        <button
            className={buttonBaseStyle}
            onClick={onClick}
        >
            {children || 'SELECT'}
        </button>
    );
};

export default DescriptionButton;
