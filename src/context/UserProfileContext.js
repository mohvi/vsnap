// src/context/UserProfileContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const UserProfileContext = createContext();

export const useUserProfile = () => useContext(UserProfileContext);

export const UserProfileProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        // Fetch user profile data from API or local storage
        const profileData = {
            name: "John Doe",
            photoUrl: "https://example.com/profile.jpg",
            bio: "Software Developer",
        };
        setUserProfile(profileData);
    }, []);

    return (
        <UserProfileContext.Provider value={{ userProfile }}>
            {children}
        </UserProfileContext.Provider>
    );
};
