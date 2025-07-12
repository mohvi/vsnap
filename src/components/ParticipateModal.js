import React, { useState } from 'react';
import { 
  X as XIcon, 
  Check as CheckIcon, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Upload as UploadIcon
} from 'lucide-react';
import { db, storage } from '../fb';
import { ref, update } from 'firebase/database';
import { uploadBytesResumable, ref as storageRef, getDownloadURL } from 'firebase/storage';

const ParticipateModal = ({ challenge, user, onClose, userData }) => {
  const [submission, setSubmission] = useState({
    mediaFile: null,
    mediaPreview: null,
    caption: '',
    termsAccepted: false,
    uploadProgress: 0,
    isSubmitting: false,
    error: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.uid) {
        throw new Error('You need to be logged in to participate!');
      }

      if (!submission.mediaFile || !submission.caption) {
        throw new Error('Please fill all required fields!');
      }

      setSubmission(prev => ({ ...prev, isSubmitting: true, error: null }));

      // Upload media file
      const fileType = challenge.type === 'photo' ? 'images' : 'videos';
      const fileRef = storageRef(storage, `${fileType}/${user.uid}/${Date.now()}_${submission.mediaFile.name}`);
      
      const uploadTask = uploadBytesResumable(fileRef, submission.mediaFile);
      
      // Wait for upload to complete
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setSubmission(prev => ({ ...prev, uploadProgress: progress }));
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      // Get download URL
      const mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);

      // Prepare participation data
      const participationData = {
        id: user.uid,
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.username || user.displayName || 'Anonymous',
        challengeId: challenge.id,
        mediaUrl,
        caption: submission.caption,
        termsAccepted: submission.termsAccepted,
        createdAt: new Date().toISOString(),
        status: 'pending',
        likes: 0,
        comments: 0,
        challengeTitle: challenge.title,
        brandName: challenge.brand?.name || '',
        brandLogo: challenge.brand?.logo || '',
        userAvatar: user.photoURL || ''
      };

      // Update database
      const updates = {};
      updates[`participations/${challenge.id}/${user.uid}`] = participationData;
      updates[`users/${user.uid}/participations/${challenge.id}`] = {
        participationId: user.uid,
        createdAt: new Date().toISOString(),
        challengeTitle: challenge.title
      };
      updates[`challenges/${challenge.id}/participants`] = (challenge.participants || 0) + 1;

      await update(ref(db), updates);

      // Success - close modal
      onClose();
      
    } catch (error) {
      console.error("Error submitting participation:", error);
      setSubmission(prev => ({ 
        ...prev, 
        isSubmitting: false,
        error: error.message || "An error occurred. Please try again."
      }));
    }
  };

  const handleMediaChange = (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const previewUrl = URL.createObjectURL(file);
    
    setSubmission({ 
      ...submission, 
      mediaFile: file,
      mediaPreview: previewUrl,
      uploadProgress: 0,
      error: null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">#VAMOS A ISSO!</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={submission.isSubmitting}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">
                {challenge.type === 'photo' ? 'Sua foto' : 'Seu vídeo'}
              </label>
              
              {submission.mediaPreview ? (
                <div className="relative">
                  {challenge.type === 'photo' ? (
                    <img 
                      src={submission.mediaPreview} 
                      alt="Preview" 
                      className="w-full h-auto max-h-80 object-contain rounded-lg border border-gray-200"
                    />
                  ) : (
                    <video 
                      src={submission.mediaPreview}
                      controls
                      className="w-full h-auto max-h-80 object-contain rounded-lg border border-gray-200"
                    />
                  )}
                  
                  {submission.uploadProgress > 0 && submission.uploadProgress < 100 && (
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${submission.uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setSubmission(prev => ({ 
                      ...prev, 
                      mediaFile: null,
                      mediaPreview: null,
                      uploadProgress: 0 
                    }))}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm hover:bg-gray-100"
                  >
                    <XIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="media-upload"
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition bg-gray-50 flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    {challenge.type === 'photo' ? (
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    ) : (
                      <VideoIcon className="w-8 h-8 text-blue-500" />
                    )}
                  </div>
                  <p className="text-gray-500 mb-2">
                    {challenge.type === 'photo' 
                      ? 'Carregue aqui' 
                      : 'Click to upload a video'}
                  </p>
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center">
                    <UploadIcon className="w-4 h-4 mr-2" />
                   ESCOLHER FOTO
                  </div>
                  <input 
                    type="file" 
                    id="media-upload"
                    accept={challenge.type === 'photo' ? "image/*" : "video/*"}
                    onChange={handleMediaChange}
                    className="hidden"
                    required
                    disabled={submission.isSubmitting}
                  />
                </label>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Descrição</label>
              <textarea 
                value={submission.caption}
                onChange={(e) => setSubmission(prev => ({ 
                  ...prev, 
                  caption: e.target.value,
                  error: null 
                }))}
                placeholder={`descrição ${challenge.type === 'photo' ? 'photo' : 'video'}...`}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                required
                disabled={submission.isSubmitting}
              />
            </div>
            
            {submission.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {submission.error}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submission.isSubmitting}
                className="flex-1 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={
                  !submission.mediaFile || 
                  submission.isSubmitting
                }
                className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center ${
                  !submission.mediaFile || 
                  submission.isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
                }`}
              >
                {submission.isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    A carregar...
                  </span>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-2" /> Participar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParticipateModal;