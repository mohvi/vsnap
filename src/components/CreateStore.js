import React, { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db, auth } from '../fb';

const CreateStore = () => {
    const [name, setName] = useState('');
    const [logo, setLogo] = useState(null);

    const handleLogoChange = (e) => {
        if (e.target.files[0]) {
            setLogo(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !logo) {
            alert('Por favor, insira o nome da loja e o logotipo.');
            return;
        }

        try {
            const user = auth.currentUser;
            const storeRef = ref(db, 'users/' + user.uid + '/stores');

            const newStore = {
                name: name,
                logo: URL.createObjectURL(logo), // Para exibir a imagem, mas para um ambiente de produção, deve carregar a imagem para um serviço de armazenamento e armazenar o URL aqui.
            };

            await push(storeRef, newStore);

            alert('Loja criada com sucesso!');
            setName('');
            setLogo(null);
        } catch (error) {
            console.error('Erro ao criar a loja: ', error);
            alert('Houve um problema ao criar a loja.');
        }
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">Criar Nova Loja</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nome da Loja
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 p-2 border border-gray-300 rounded w-full"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
                        Logotipo da Loja
                    </label>
                    <input
                        type="file"
                        id="logo"
                        onChange={handleLogoChange}
                        className="mt-1 p-2 border border-gray-300 rounded w-full"
                        accept="image/*"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                >
                    Criar Loja
                </button>
            </form>
        </div>
    );
};

export default CreateStore;
