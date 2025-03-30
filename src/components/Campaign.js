import React, { useEffect, useState } from "react";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  serverTimestamp,
  update,
} from "firebase/database";
import { Link, useParams } from "react-router-dom";
import { FaCalendarAlt, FaGift, FaUsers } from "react-icons/fa";
import { Share } from "@mui/icons-material";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import LinearProgress from "@mui/material/LinearProgress";
import Modal from "@mui/material/Modal";
import { db } from "../fb";
import GridPosts from "./GridPosts";

const Campaign = ({ user }) => {
  const { id } = useParams();
  const [campaignData, setCampaignData] = useState([]);
  const [posts, setPosts] = useState([]);
  const [participants, setParticipants] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [hasParticipated, setHasParticipated] = useState(false);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [hasPosted, setHasPosted] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [activeTab, setActiveTab] = useState(2);

  const handleEdit = () => {
    if (!canEdit) return;
 
  };
  
  const handleDelete = () => {
    if (!canDelete) return;
  
    // Lógica para apagar a publicação
    setHasPosted(false); // Permitir nova publicação
    setCanEdit(true);
    setCanDelete(true);
  };
  useEffect(() => {
    const campRef = ref(db, `challenges/${id}`);
    onValue(campRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCampaignData(data);
  
        // Contar participantes
        const participantCount = data.participants ? Object.keys(data.participants).length : 0;
        setParticipants(participantCount);
  
        // Verificar se o usuário já participou
        if (data.participants && data.participants[user.uid]) {
          setHasParticipated(true);
        } else {
          setHasParticipated(false);
        }
      }
    });
  
const postsRef = ref(db, `challenges/${id}/posts`);
onValue(postsRef, (snapshot) => {
  if (snapshot.exists()) {
    const posts = snapshot.val();
    setPosts(posts);

    const userHasPosted = Object.values(posts).some(post => post.userId === user.uid);
    setHasPosted(userHasPosted);
  }
});

  }, [id, user.uid]);   

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const addParticipant = () => {
    const participantsRef = ref(db, `challenges/${id}/participants/${user.uid}`);
    set(participantsRef, {
      nome: user.displayName || buyerName,
      phoneNumber: phoneNumber,
    });

    const userChallengeRef = ref(db, `users/${user.uid}/challengesParticipated/${id}`);

    set(userChallengeRef, {
      challenge:id,
      joinedAt: new Date().toISOString(),
    }).then(() => {
      console.log("Participação salva com sucesso!");
    }).catch((error) => {
      console.error("Erro ao salvar participação:", error);
    });


    setParticipants((prev) => prev + 1);
    handleCloseModal();
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handlePublish = () => {
    if (!file || !caption) {
      alert("Por favor, insira uma imagem e uma legenda.");
      return;
    }
    if (hasPosted) return;
  
    // Publicação do conteúdo
    setHasPosted(true);
  
    // Definir prazo de 1 minuto para edição/remoção
    setTimeout(() => {
      setCanEdit(false);
      setCanDelete(false);
    }, 60000);
    const storage = getStorage();
    const fileRef = storageRef(storage, `feed/${user.uid}/${file.name}`);

    uploadBytes(fileRef, file)
      .then(() => getDownloadURL(fileRef))
      .then((url) => {
        const postRef = push(ref(db, `challenges/${id}/posts`));
        set(postRef, {
          userId: user.uid,
          userName: user.displayName || buyerName,
          photoUrl: url,
          caption: caption,
          likes: {},
          comments: {},
          createdAt: serverTimestamp(),
        });

        setFile(null);
        setCaption("");
      })
      .catch((error) => {
        console.error("Erro ao fazer upload da imagem:", error);
        alert("Falha ao publicar a imagem.");
      });
  };

  const progress = (participants / campaignData.limiteParticipantes) * 100;

  const valorMonetario = parseInt(campaignData.recompensa);
  const limiteParticipantes = campaignData.limiteParticipantes || 1;
  let valorParticipacao = Math.round(valorMonetario / limiteParticipantes);
  valorParticipacao = valorParticipacao < 5 ? 5 : valorParticipacao;

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg max-w-mx mx-auto mt-4">
      <img
        src={campaignData.imageUrls}
        alt={campaignData.titulo}
        className="w-full h-48 object-cover rounded-md mt-4"
      />
      <h2 className="text-2xl font-bold text-orange-800 text-center my-4">
        {campaignData.titulo}
      </h2>

      <div className="bg-gray-100 p-4 space-y-4 text-gray-700">
        <div className="flex items-center space-x-2">
          <FaCalendarAlt className="text-blue-600" />
          <span className="font-semibold">Data Limite:</span>
          <span>{campaignData.dataLimite}</span>
        </div>

        <div className="flex items-center space-x-2">
          <FaGift className="text-green-600" />
          <span className="font-semibold">Ganhas:</span>
          <span>{campaignData.recompensa}MT</span>
        </div>

        <div className="flex items-center space-x-2">
          <FaUsers className="text-red-600" />
          <span className="font-semibold">Limite de Participantes:</span>
          <span>{campaignData.limiteParticipantes}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-gray-700 font-semibold mb-2">Progresso dos Participantes:</div>
        <LinearProgress variant="determinate" value={progress} className="mb-2" />
        <div className="text-gray-600 text-sm">Participantes: {participants}/{campaignData?.limiteParticipantes || 0}</div>
      </div>

      {!hasParticipated && (
        <button
          className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 duration-200 shadow-md"
          onClick={handleOpenModal}>
          Participar
        </button>
      )}



<div className="container mx-auto p-4">
<div className="tabs flex border-b">
    <span
        onClick={() => setActiveTab(1)}
        className={`tab-btn py-2 px-4 text-lg ${
            activeTab === 1 ? 'border-b-2 font-semibold' : 'text-gray-700'
        }`}>
     Publicar
    </span>
    <span
        onClick={() => setActiveTab(2)}
        className={`tab-btn py-2 px-4 text-lg ${
            activeTab === 2 ? 'border-b-2 font-semibold' : 'text-gray-700'
        }`}
    >
       Postagens
    </span>
</div>


            <div className="tab-content mt-4">
                {activeTab === 1 && (
                    <div className="content">
                      
{hasParticipated && (
  <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-2xl rounded-xl p-8 my-6 max-w-md mx-auto transition-transform transform hover:scale-105 duration-300">
    <h2 className="text-2xl font-extrabold mb-6 text-center">
      Publique sua foto no feed
    </h2>
    {hasPosted && (
      <p className="text-sm text-gray-200 mb-3">
        Você já publicou sua foto para este desafio. Edite ou apague sua publicação abaixo dentro de 1 minuto.
      </p>
    )}
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      className="mb-4 block w-full text-white file:bg-white file:text-indigo-500 file:font-bold file:border-none file:rounded-lg file:px-4 file:py-2 file:cursor-pointer focus:ring-2 focus:ring-white"
      disabled={hasPosted}
    />
    <textarea
      value={caption}
      onChange={(e) => setCaption(e.target.value)}
      placeholder="Escreva uma legenda criativa..."
      className="w-full mb-4 p-3 border-none rounded-lg shadow-inner text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      disabled={hasPosted}
    ></textarea>
    <button
      className={`bg-green-600 text-white font-bold py-3 px-6 rounded-lg w-full hover:bg-green-700 transition-transform transform hover:scale-105 duration-200 shadow-lg ${
        hasPosted ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={handlePublish}
      disabled={hasPosted}
    >
      {hasPosted ? "Você já publicou" : "Publicar no Feed"}
    </button>
    {hasPosted && (
      <div className="mt-6 text-center">
        <button
          className={`bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-transform transform hover:scale-105 duration-200 mr-3 shadow-md ${
            !canEdit ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleEdit}
          disabled={!canEdit}
        >
          Editar Publicação
        </button>
        <button
          className={`bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105 duration-200 shadow-md ${
            !canDelete ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleDelete}
          disabled={!canDelete}
        >
          Apagar Publicação
        </button>
        {!canEdit && <p className="text-sm mt-2 text-red-300">O tempo para editar/apagar expirou.</p>}
      </div>
    )}
  </div>
)}
                    </div>
                )}
                {activeTab === 2 && (
                    <div className="content">
                      <GridPosts posts={posts} user={user} campaign={id}/>

                    </div>
                )}
            </div>
        </div>

      <Modal open={openModal} onClose={handleCloseModal}>
        <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-20">
          <h2 className="text-lg font-bold mb-4">Confirmação de Participação</h2>
          <p className="text-gray-700 mb-4">
            Para participar, deposite o valor de <strong>{valorParticipacao}MT</strong> e insira os dados abaixo:
          </p>
          <input
            type="text"
            placeholder="Nome"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            placeholder="Número de Telefone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          >
            <option value="">Selecione o Método de Pagamento</option>
            <option value="Mpesa">Mpesa</option>
            <option value="Paypal">Paypal</option>
          </select>
          <button
            className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 duration-200 shadow-md"
            onClick={addParticipant}
          >
            Confirmar Participação
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Campaign;
