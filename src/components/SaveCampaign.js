import React, { useState, useEffect } from "react";
import { getDatabase, ref, push, set } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; 
import { use } from "react";

const SaveCampaign = ({user}) => {


  const [campaignData, setCampaignData] = useState({
    titulo: "",
    descricao: "",
    recompensa: "",
    dataLimite: "",
    limiteParticipantes: "",
    imageFiles: [],
    status: "open",
    user:user
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrls, setImageUrls] = useState([]); 

  useEffect(() => {
    if (uploading && imageUrls.length === campaignData.imageFiles.length) {
      setUploading(false);
    }
  }, [uploading, imageUrls, campaignData.imageFiles.length]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCampaignData({ ...campaignData, [name]: value });
  };

  const handleDescriptionChange = (value) => {
    setCampaignData({ ...campaignData, descricao: value });
  };

  const handleFileChange = (e) => {
    setCampaignData({ ...campaignData, imageFiles: Array.from(e.target.files) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { titulo, descricao, recompensa, dataLimite, imageFiles } = campaignData;
  
    if (!titulo || !descricao || !recompensa || !dataLimite || imageFiles.length === 0) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
  
    if (new Date(dataLimite) < new Date()) {
      alert("A data limite não pode ser no passado.");
      return;
    }
  
    const db = getDatabase();
    const storage = getStorage();
  
    setUploading(true);
  
    const uploadPromises = imageFiles.map((imageFile) => {
      const fileRef = storageRef(storage, `challenges/${imageFile.name}`);
      const uploadTask = uploadBytesResumable(fileRef, imageFile); 
  
      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress); 
          },
          (error) => {
            reject(error); 
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(resolve); 
          }
        );
      });
    });
  
    Promise.all(uploadPromises)
      .then((imageUrls) => {
        const campaignsRef = ref(db, "challenges");
        const newCampaignRef = push(campaignsRef);
  
        return set(newCampaignRef, {
          id: newCampaignRef.key,
          titulo,
          descricao,
          recompensa,
          dataLimite,
          limiteParticipantes: campaignData.limiteParticipantes || "Sem limite",
          imageUrls, 
          status:'ativo',
          likes: 0, 
        });
      })
      .then(() => {
        alert("Campanha cadastrada com sucesso!");
        setCampaignData({ 
          titulo: "", 
          descricao: "", 
          recompensa: "", 
          dataLimite: "", 
          limiteParticipantes: "", 
          imageFiles: [], 
          status: "open" 
        });
        setUploading(false);
      })
      .catch((error) => {
        console.error("Erro ao cadastrar a campanha: ", error);
        setUploading(false);
      });
  };
  

  return (
    <div className="bg-white shadow-md rounded-lg p-4 max-w-md mx-auto">
      <h2 className="text-center text-xl font-semibold text-gray-800 mb-4">Cadastro de Nova Campanha</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Título da Campanha</label>
          <input
            type="text"
            name="titulo"
            value={campaignData.titulo}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none"
            placeholder="Digite o título da campanha"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Descrição</label>
          <ReactQuill 
            value={campaignData.descricao} 
            onChange={handleDescriptionChange}
            className="w-full bg-white rounded-lg mb-2"
            placeholder="Digite a descrição da campanha"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Recompensa</label>
          <input
            type="text"
            name="recompensa"
            value={campaignData.recompensa}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none"
            placeholder="Ex: 1GB de internet"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Data Limite</label>
          <input
            type="date"
            name="dataLimite"
            value={campaignData.dataLimite}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Limite de Participantes (Opcional)</label>
          <input
            type="number"
            name="limiteParticipantes"
            value={campaignData.limiteParticipantes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none"
            placeholder="Ex: 100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Imagens da Campanha</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none"
            required
            multiple
          />
        </div>

        {uploading && (
          <div className="mb-4">
            <div className="bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{`Enviando... ${uploadProgress}%`}</p>
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-blue-600 transition duration-300"
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Cadastrar Campanha"}
        </button>
      </form>
    </div>
  );
};

export default SaveCampaign;
