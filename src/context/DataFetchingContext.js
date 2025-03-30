// src/context/DataFetchingContext.js
import { createContext, useContext, useState } from 'react';

const DataFetchingContext = createContext();

export const useDataFetching = () => useContext(DataFetchingContext);

export const DataFetchingProvider = ({ children }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async (url) => {
        setIsLoading(true);
        try {
            const response = await fetch(url);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DataFetchingContext.Provider value={{ data, isLoading, fetchData }}>
            {children}
        </DataFetchingContext.Provider>
    );
};
