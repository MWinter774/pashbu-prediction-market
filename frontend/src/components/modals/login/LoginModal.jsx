import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useHistory } from 'react-router-dom';
import { PersonInput, LockInput } from '../../inputs/InputBar';
const LoginModal = ({ isOpen, onClose, onLogin, redirectAfterLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const history = useHistory();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const loginSuccess = await onLogin(username, password);
            if (loginSuccess) {
                onClose();
                history.push(redirectAfterLogin);
            } else {
                setError('Error logging in.');
            }
        } catch (loginError) {
            console.error('Login error:', loginError);
            setError('An error occurred during login. Please try again.');
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-pm-card border border-pm-card-border rounded-xl p-8 max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white text-center mb-6">
                    Welcome to SocialPredict
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <PersonInput value={username} onChange={(e) => {
                        setUsername(e.target.value);
                    }} />
                    <LockInput value={password} onChange={(e) => {
                        setPassword(e.target.value);
                    }} />
                    {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                    <button
                        type="submit"
                        className="w-full py-3 text-white font-semibold bg-pm-blue hover:bg-pm-blue-hover rounded-lg focus:outline-none transition-colors"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')
    );
};

export default LoginModal;
