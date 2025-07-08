import React, { useState, useRef, useEffect } from 'react';
import { 
  X as XIcon, 
  Check as CheckIcon, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Crop as CropIcon,
  RotateCw as RotateCwIcon,
  Sliders as SlidersIcon,
  Type as TypeIcon,
  Download as DownloadIcon
} from 'lucide-react';
import { db, storage } from '../fb';
import { ref, update } from 'firebase/database';
import { uploadBytesResumable, ref as storageRef, getDownloadURL } from 'firebase/storage';

const ParticipateModal = ({ challenge, user, onClose, userData }) => {
  const [submission, setSubmission] = useState({
    originalImage: null,
    editedImage: null,
    finalImage: null,
    caption: '',
    termsAccepted: false,
    uploadProgress: 0,
    isSubmitting: false,
    activeTool: null,
    filters: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      warmth: 0,
      vignette: 0
    },
    textElements: []
  });

  const [currentText, setCurrentText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (submission.originalImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Apply filters
        const { brightness, contrast, saturation, warmth, vignette } = submission.filters;
        ctx.filter = `
          brightness(${brightness}%)
          contrast(${contrast}%)
          saturate(${saturation}%)
          sepia(${warmth}%)
        `;
        ctx.drawImage(canvas, 0, 0);
        
        // Apply vignette
        if (vignette > 0) {
          const gradient = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.4,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.7
          );
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(1, `rgba(0, 0, 0, ${vignette/100})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Add text elements
        submission.textElements.forEach(text => {
          ctx.font = `${text.size}px Arial`;
          ctx.fillStyle = text.color;
          ctx.fillText(text.content, text.x, text.y);
        });
        
        // Update the edited image
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          setSubmission(prev => ({ ...prev, editedImage: url }));
        }, 'image/jpeg', 0.9);
      };
      
      img.src = submission.originalImage;
    }
  }, [submission.originalImage, submission.filters, submission.textElements]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.uid) {
        alert('You need to be logged in to participate!');
        return;
      }

      if (!submission.finalImage || !submission.caption || !submission.termsAccepted) {
        alert('Please fill all fields and accept the terms!');
        return;
      }

      setSubmission(prev => ({ ...prev, isSubmitting: true }));

      const participationData = {
        id: user.uid,
        userId: user.uid,
        userEmail: user.email,
        userName: userData.username || 'Anonymous',
        challengeId: challenge.id,
        imageUrl: submission.finalImage,
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

      alert(`Participation submitted successfully for: ${challenge.title}`);
      onClose();
      
    } catch (error) {
      console.error("Error submitting participation:", error);
      alert("An error occurred while submitting your participation. Please try again.");
    } finally {
      setSubmission(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleImageChange = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    try {
      const previewUrl = URL.createObjectURL(file);
      setSubmission({ 
        ...submission, 
        originalImage: previewUrl,
        editedImage: null,
        finalImage: null,
        uploadProgress: 0,
        isSubmitting: false,
        activeTool: null,
        filters: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          warmth: 0,
          vignette: 0
        },
        textElements: []
      });
      
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing the file. Please try again.");
      setSubmission(prev => ({ 
        ...prev, 
        originalImage: null,
        editedImage: null,
        finalImage: null, 
        uploadProgress: 0,
        isSubmitting: false 
      }));
    }
  };

  const handleSaveImage = async () => {
    if (!canvasRef.current) return;
    
    try {
      setSubmission(prev => ({ ...prev, isSubmitting: true }));
      
      canvasRef.current.toBlob(async (blob) => {
        const fileType = challenge.type === 'photo' ? 'images' : 'videos';
        const fileRef = storageRef(storage, `${fileType}/${user.uid}/${Date.now()}_edited.jpg`);
        
        const uploadTask = uploadBytesResumable(fileRef, blob);
        
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setSubmission(prev => ({ ...prev, uploadProgress: progress }));
          },
          (error) => {
            console.error("Upload failed:", error);
            alert("Media upload failed. Please try again.");
            setSubmission(prev => ({ 
              ...prev, 
              isSubmitting: false,
              uploadProgress: 0
            }));
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setSubmission(prev => ({ 
              ...prev, 
              finalImage: downloadURL,
              uploadProgress: 100,
              isSubmitting: false,
              activeTool: null
            }));
          }
        );
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error("Error saving image:", error);
      alert("Error saving the image. Please try again.");
      setSubmission(prev => ({ 
        ...prev, 
        isSubmitting: false,
        uploadProgress: 0
      }));
    }
  };

  const handleCanvasClick = (e) => {
    if (submission.activeTool === 'text' && currentText && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setSubmission(prev => ({
        ...prev,
        textElements: [
          ...prev.textElements,
          {
            content: currentText,
            x,
            y,
            size: textSize,
            color: textColor
          }
        ]
      }));
      
      setCurrentText('');
    }
  };

  const resetEditing = () => {
    setSubmission(prev => ({
      ...prev,
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        warmth: 0,
        vignette: 0
      },
      textElements: [],
      activeTool: null
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Participate in challenge</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={submission.isSubmitting}
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">
                {challenge.type === 'photo' ? 'Upload and edit your photo' : 'Upload your video'}
              </label>
              
              {submission.originalImage ? (
                <div className="relative">
                  {/* Editing toolbar */}
                  <div className="flex gap-2 mb-4 overflow-x-auto py-2">
                    <button
                      type="button"
                      onClick={() => setSubmission(prev => ({ ...prev, activeTool: prev.activeTool === 'filters' ? null : 'filters' }))}
                      className={`p-2 rounded-lg flex items-center ${submission.activeTool === 'filters' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <SlidersIcon className="w-5 h-5 mr-1" /> Filters
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSubmission(prev => ({ ...prev, activeTool: prev.activeTool === 'text' ? null : 'text' }))}
                      className={`p-2 rounded-lg flex items-center ${submission.activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <TypeIcon className="w-5 h-5 mr-1" /> Text
                    </button>
                    
                    <button
                      type="button"
                      onClick={resetEditing}
                      className="p-2 rounded-lg flex items-center bg-gray-100 hover:bg-gray-200"
                    >
                      <RotateCwIcon className="w-5 h-5 mr-1" /> Reset
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSaveImage}
                      disabled={submission.isSubmitting}
                      className={`p-2 rounded-lg flex items-center ml-auto ${
                        submission.isSubmitting
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      <DownloadIcon className="w-5 h-5 mr-1" /> Save Edits
                    </button>
                  </div>
                  
                  {/* Image editor */}
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                    <canvas
                      ref={canvasRef}
                      className={`w-full h-auto max-h-[500px] object-contain mx-auto ${submission.activeTool === 'text' ? 'cursor-text' : ''}`}
                      onClick={handleCanvasClick}
                    />
                    
                    {submission.activeTool === 'filters' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brightness</label>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={submission.filters.brightness}
                              onChange={(e) => setSubmission(prev => ({
                                ...prev,
                                filters: { ...prev.filters, brightness: parseInt(e.target.value) }
                              }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contrast</label>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={submission.filters.contrast}
                              onChange={(e) => setSubmission(prev => ({
                                ...prev,
                                filters: { ...prev.filters, contrast: parseInt(e.target.value) }
                              }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Saturation</label>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={submission.filters.saturation}
                              onChange={(e) => setSubmission(prev => ({
                                ...prev,
                                filters: { ...prev.filters, saturation: parseInt(e.target.value) }
                              }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Warmth</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={submission.filters.warmth}
                              onChange={(e) => setSubmission(prev => ({
                                ...prev,
                                filters: { ...prev.filters, warmth: parseInt(e.target.value) }
                              }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vignette</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={submission.filters.vignette}
                              onChange={(e) => setSubmission(prev => ({
                                ...prev,
                                filters: { ...prev.filters, vignette: parseInt(e.target.value) }
                              }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {submission.activeTool === 'text' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
                        <div className="flex flex-col space-y-3">
                          <input
                            type="text"
                            value={currentText}
                            onChange={(e) => setCurrentText(e.target.value)}
                            placeholder="Enter your text"
                            className="border border-gray-300 rounded-lg p-2"
                          />
                          <div className="flex items-center space-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                              <input
                                type="color"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="w-8 h-8"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                              <input
                                type="range"
                                min="12"
                                max="72"
                                value={textSize}
                                onChange={(e) => setTextSize(parseInt(e.target.value))}
                                className="w-24"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Click on the image to position the text
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {submission.uploadProgress > 0 && submission.uploadProgress < 100 && (
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${submission.uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition bg-gray-50">
                  <div>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      {challenge.type === 'photo' ? (
                        <ImageIcon className="w-6 h-6 text-blue-500" />
                      ) : (
                        <VideoIcon className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <p className="text-gray-500 mb-1">Click to upload or drag files</p>
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
                      Select file
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {submission.finalImage && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">Caption</label>
                  <textarea 
                    value={submission.caption}
                    onChange={(e) => setSubmission({...submission, caption: e.target.value})}
                    placeholder={`Write a creative caption for your ${challenge.type === 'photo' ? 'photo' : 'video'}...`}
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
                      I confirm this content is original and was created by me.
                    </span>
                  </label>
                </div>
                
                <button 
                  type="submit"
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${
                    !submission.finalImage || 
                    !submission.termsAccepted || 
                    submission.uploadProgress < 100 ||
                    submission.isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-md'
                  }`}
                  disabled={
                    !submission.finalImage || 
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
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5 mr-2" /> Submit Participation
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParticipateModal;