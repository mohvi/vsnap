import React, { createContext, useState, useContext } from 'react';

// Criar o contexto do tema
const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light'); // 'light' ou 'dark'

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div className={theme === 'dark' ? 'dark' : ''}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
