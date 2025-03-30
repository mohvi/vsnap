import React from 'react';
import { Link } from 'react-router-dom';

const Stores = ({ stores, products, hasStore }) => {

    console.log(hasStore)
    return (
        <div className="p-4">
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Lojas</h2>
                <Link 
  to={hasStore ? '/manage-store' : '/create-store'} 
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  {hasStore ? 'Gerir Loja' : 'Criar Loja'}
</Link>

            </header>

            {/* Lista de Lojas em formato de Stories */}
            <div className="flex space-x-4 overflow-x-auto mb-6">
                    <div  className="w-24 h-24 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-center">
                        <span>{stores.name}</span>
                    </div>
            </div>

            {/* Lista de Produtos em forma de Grelha */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-32 object-cover" />
                        <div className="p-2">
                            <h3 className="text-sm font-semibold">{product.name}</h3>
                            <p className="text-sm text-gray-500">{product.price}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Stores;