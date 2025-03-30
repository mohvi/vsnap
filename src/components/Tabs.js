import React, { useState } from 'react';

const Tabs = () => {
    const [activeTab, setActiveTab] = useState(1); // Estado para gerenciar a aba ativa

    return (
        <div className="container mx-auto p-4">
            <div className="tabs flex border-b-2">
                <button
                    onClick={() => setActiveTab(1)}
                    className={`tab-btn py-2 px-4 text-lg ${activeTab === 1 ? 'border-b-2 border-blue-500' : 'text-gray-500'}`}
                >
                    Aba 1
                </button>
                <button
                    onClick={() => setActiveTab(2)}
                    className={`tab-btn py-2 px-4 text-lg ${activeTab === 2 ? 'border-b-2 border-blue-500' : 'text-gray-500'}`}
                >
                    Aba 2
                </button>
            </div>

            <div className="tab-content mt-4">
                {activeTab === 1 && (
                    <div className="content">
                        <h2 className="text-xl font-bold">Conteúdo da Aba 1</h2>
                        <p>Esse é o conteúdo da primeira aba.</p>
                    </div>
                )}
                {activeTab === 2 && (
                    <div className="content">
                        <h2 className="text-xl font-bold">Conteúdo da Aba 2</h2>
                        <p>Esse é o conteúdo da segunda aba.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tabs;
