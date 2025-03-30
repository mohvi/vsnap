import { FaExclamationTriangle } from "react-icons/fa"; // Importa o ícone de aviso

const NotAllowed = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-red-50">
      <div className="bg-red-100 text-red-800 p-6 rounded-md text-center shadow-md max-w-sm">
        <div className="flex flex-col items-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mb-4" />
          <p className="font-bold text-lg">
            Você ainda não pode criar desafios.
          </p>
          <p className="text-sm mt-2">
           Convide 10 amigos para pode criar desafios
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotAllowed;
