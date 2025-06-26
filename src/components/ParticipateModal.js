import React, { useState } from 'react';
import { X, Check, Image, Video } from 'lucide-react';
import { db, storage } from '../fb';
import { ref, update } from 'firebase/database';
import { uploadBytesResumable, ref as storageRef, getDownloadURL } from 'firebase/storage';

const ParticipateModal = ({ challenge, user, onClose }) => {
  const [submission, setSubmission] = useState({
    previewImage: null, // URL temporária para pré-visualização
    image: null,       // URL permanente do Firebase Storage
    caption: '',
    termsAccepted: false,
    uploadProgress: 0,
    isSubmitting: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.uid) {
        alert('Você precisa estar logado para participar!');
        return;
      }

      if (!submission.image || !submission.caption || !submission.termsAccepted) {
        alert('Por favor, preencha todos os campos e aceite os termos!');
        return;
      }

      setSubmission(prev => ({ ...prev, isSubmitting: true }));

      const participationData = {
        id: user.uid,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anônimo',
        challengeId: challenge.id,
        imageUrl: submission.image, // Usa a URL permanente aqui
        caption: submission.caption,
        termsAccepted: submission.termsAccepted,
        createdAt: new Date().toISOString(),
        status: 'pending',
        likes: 0,
        comments: 0,
        challengeTitle: challenge.title,
        brandName: challenge.brand.name,
        brandLogo: challenge?.brand?.logo || '',
        userAvatar: user.photoURL || ''
      };

      const updates = {};
      updates[`participations/${challenge.id}/${user.uid}`] = participationData;
      updates[`users/${user.uid}/participations/${challenge.id}`] = {
        participationId: user.uid,
        createdAt: new Date().toISOString(),
        challengeTitle: challenge.title
      };
      updates[`challenges/${challenge.id}/participants`] = challenge.participants + 1;

      await update(ref(db), updates);

      alert(`Participação enviada com sucesso para: ${challenge.title}`);
      onClose();
      
    } catch (error) {
      console.error("Erro ao enviar participação:", error);
      alert("Ocorreu um erro ao enviar sua participação. Por favor, tente novamente.");
    } finally {
      setSubmission(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleImageChange = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const fileType = challenge.type === 'photo' ? 'images' : 'videos';
    const fileRef = storageRef(storage, `${fileType}/${user.uid}/${Date.now()}_${file.name}`);
    
    try {
      const maxSize = challenge.type === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`Arquivo muito grande. Tamanho máximo: ${challenge.type === 'photo' ? '10MB' : '50MB'}`);
        return;
      }

      // Cria URL temporária para pré-visualização
      const previewUrl = URL.createObjectURL(file);
      setSubmission({ 
        ...submission, 
        previewImage: previewUrl,
        image: null, // Limpa qualquer imagem anterior
        uploadProgress: 0,
        isSubmitting: true 
      });
      
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setSubmission(prev => ({ ...prev, uploadProgress: progress }));
        },
        (error) => {
          console.error("Upload failed:", error);
          alert("Falha no upload da mídia. Por favor, tente novamente.");
          setSubmission(prev => ({ 
            ...prev, 
            previewImage: null,
            image: null, 
            uploadProgress: 0,
            isSubmitting: false 
          }));
          URL.revokeObjectURL(previewUrl); // Limpa a URL temporária
        },
        async () => {
          // Obtém URL permanente do Firebase
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setSubmission(prev => ({ 
            ...prev, 
            previewImage: null, // Limpa a pré-visualização
            image: downloadURL, // Armazena a URL permanente
            uploadProgress: 100,
            isSubmitting: false 
          }));
          URL.revokeObjectURL(previewUrl); // Limpa a URL temporária
        }
      );
      
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Erro ao processar o arquivo. Por favor, tente novamente.");
      setSubmission(prev => ({ 
        ...prev, 
        previewImage: null,
        image: null, 
        uploadProgress: 0,
        isSubmitting: false 
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Participar no desafio</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={submission.isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">
                {challenge.type === 'photo' ? 'Envie sua foto' : 'Envie seu vídeo'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition bg-gray-50">
                {submission.previewImage || submission.image ? (
                  <div className="relative">
                    {challenge.type === 'photo' ? (
                      <img 
                        src={submission.previewImage || submission.image} 
                        alt="Preview" 
                        className="w-full h-48 object-contain mx-auto" 
                      />
                    ) : (
                      <video 
                        controls 
                        className="w-full h-48 object-contain mx-auto"
                      >
                        <source src={submission.previewImage || submission.image} type="video/mp4" />
                        Seu navegador não suporta vídeos.
                      </video>
                    )}
                    {!submission.isSubmitting && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (submission.previewImage) {
                            URL.revokeObjectURL(submission.previewImage);
                          }
                          setSubmission({
                            ...submission, 
                            previewImage: null,
                            image: null, 
                            uploadProgress: 0
                          })
                        }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    {submission.uploadProgress > 0 && submission.uploadProgress < 100 && (
                      <div className="absolute bottom-2 left-2 right-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${submission.uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      {challenge.type === 'photo' ? (
                        <Image className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Video className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <p className="text-gray-500 mb-1">Clique para enviar ou arraste arquivos</p>
                    <p className="text-sm text-gray-400">
                      {challenge.type === 'photo' 
                        ? "Formatos: JPG, PNG (até 10MB)" 
                        : "Formatos: MP4 (15-60 segundos, até 50MB)"}
                    </p>
                    <input 
                      type="file" 
                      accept={challenge.type === 'photo' ? "image/*" : "video/*"}
                      onChange={handleImageChange}
                      className="hidden"
                      id="media-upload"
                      required
                      disabled={submission.isSubmitting}
                    />
                    <label 
                      htmlFor="media-upload"
                      className={`mt-4 inline-block px-4 py-2 rounded-lg transition cursor-pointer ${
                        submission.isSubmitting
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Selecionar arquivo
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Legenda</label>
              <textarea 
                value={submission.caption}
                onChange={(e) => setSubmission({...submission, caption: e.target.value})}
                placeholder={`Escreva uma legenda criativa para sua ${challenge.type === 'photo' ? 'foto' : 'vídeo'}...`}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                required
                disabled={submission.isSubmitting}
              />
            </div>
            
            <div className="mb-6">
              <label className="flex items-start">
                <input 
                  type="checkbox" 
                  checked={submission.termsAccepted}
                  onChange={(e) => setSubmission({...submission, termsAccepted: e.target.checked})}
                  className="mt-1 mr-2"
                  required
                  disabled={submission.isSubmitting}
                />
                <span className="text-sm text-gray-600">
                  Confirmo que este conteúdo é original e foi criado por mim.
                </span>
              </label>
            </div>
            
            <button 
              type="submit"
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${
                !submission.image || 
                !submission.termsAccepted || 
                submission.uploadProgress < 100 ||
                submission.isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-md'
              }`}
              disabled={
                !submission.image || 
                !submission.termsAccepted || 
                submission.uploadProgress < 100 ||
                submission.isSubmitting
              }
            >
              {submission.isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </span>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" /> Enviar Participação
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParticipateModal;