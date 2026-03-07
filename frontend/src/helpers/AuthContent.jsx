import { API_URL } from './../config';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
    username: null,
    setUsername: () => {},
    isLoggedIn: false,
    permissions: [],
    changePasswordNeeded: true,
    login: () => {},
    logout: () => {},
});

const useAuth = () => useContext(
    AuthContext
);

const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isLoggedIn: false,
        token: localStorage.getItem('token'),
        username: localStorage.getItem('username'),
        permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
        changePasswordNeeded: null
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthState(prevState => ({
                ...prevState,
                isLoggedIn: true,
                token: token,
                username: localStorage.getItem('username'),
                permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
                changePasswordNeeded: localStorage.getItem('changePasswordNeeded') === 'true',
            }));
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/v0/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const text = await response.text();
            let data = {};

            try {
                data = JSON.parse(text);
            } catch (parseError) {
                data = { error: text || 'Unknown error occurred' };
            }

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
                localStorage.setItem('changePasswordNeeded', data.mustChangePassword);
                setAuthState({
                    isLoggedIn: true,
                    token: data.token,
                    username: data.username,
                    permissions: data.permissions || [],
                    changePasswordNeeded: data.mustChangePassword,
                });
                return true;
            } else {
                const errorMessage = data.error || data.message || `HTTP ${response.status}: ${text}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.clear();
        setAuthState({
            isLoggedIn: false,
            token: null,
            username: null,
            permissions: [],
            changePasswordNeeded: null,
        });
    };

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export { useAuth, AuthProvider, AuthContext };
