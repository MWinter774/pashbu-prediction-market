import React from 'react';

const ProfileEditButton = ({ onClick, children, isSelected }) => {
    const selectedStyle = "bg-pm-blue border-transparent";
    const unselectedStyle = "bg-pm-card border-pm-card-border";

    return (
        <button
            className={`p-1 rounded-lg text-lg ${isSelected ? selectedStyle : unselectedStyle} flex items-center justify-center`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default ProfileEditButton;
