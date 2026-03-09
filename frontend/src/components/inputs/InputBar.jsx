import React from 'react';

const RegularInput = ({ value, onChange, placeholder, type = 'text', id, name, autoComplete }) => {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            id={id}
            name={name}
            autoComplete={autoComplete}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};


const NumberInput = ({ value, onChange }) => {
    return (
        <input
            type="number"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};

const SuccessInput = ({ value, onChange }) => {
    return (
    <div className="flex items-center border border-green-500 bg-pm-page rounded-lg">
        <input
        type="text"
        placeholder="Success"
        value={value}
        onChange={onChange}
        className="flex-1 px-4 py-2 rounded-lg text-white bg-transparent focus:outline-none"
        />
        <span className="h-5 w-5 text-green-500 mr-2">✓</span>
    </div>
    );
};

const ErrorInput = ({ value, onChange }) => {
    return (
    <div className="flex items-center border border-red-500 bg-pm-page rounded-lg">
        <input
        type="text"
        placeholder="Error Input"
        value={value}
        onChange={onChange}
        className="flex-1 px-4 py-2 rounded-lg text-white bg-transparent focus:outline-none"
        />
        <span className="h-5 w-5 text-red-500 mr-2">✗</span>
    </div>
    );
};

const PersonInput = ({ value, onChange }) => {
    return (
        <input
            type="text"
            placeholder="Username"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};

const LockInput = ({ value, onChange }) => {
    return (
        <input
            type="password"
            placeholder="Password"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};

export { RegularInput, NumberInput, SuccessInput, ErrorInput, PersonInput, LockInput };
