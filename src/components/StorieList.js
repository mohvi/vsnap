import React from 'react';

const StorieList = () => {
  const stores = [
    { id: 1, name: 'Loja 365', imageUrl: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Momas Shop', imageUrl: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Loja 3', imageUrl: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Loja 4', imageUrl: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Loja 5', imageUrl: 'https://via.placeholder.com/150' },
  ];

  return (
    <div className="flex space-x-4 p-4 bg-white shadow-md rounded-lg overflow-x-auto">
      {stores.map(store => (
        <div key={store.id} className="flex flex-col items-center space-y-2">
          <img
            src={store.imageUrl}
            alt={store.name}
            className="w-16 h-16 rounded-full border-2 border-blue-500"
          />
          <span className="text-sm text-gray-800 text-center">{store.name}</span>
        </div>
      ))}
    </div>
  );
};

export default StorieList;
