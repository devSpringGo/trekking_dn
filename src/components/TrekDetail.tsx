import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, MessageSquare, Camera, Send, Trash2, User, Upload, FolderSync, ArrowUpRight } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, OperationType, handleFirestoreError, formatDriveUrl, uploadFile } from '../firebase';
import { fetchDriveFolderImages, extractFolderId } from '../services/driveService';
import { useAuth } from '../AuthContext';
import { formatDate } from '../lib/utils';

interface Trek {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  coverImage?: string;
  authorName: string;
  authorId: string;
  specifications?: {
    terrain: string;
    elevation: string;
    intensity: string;
    duration: string;
  };
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  authorName: string;
  authorId: string;
  driveLink?: string;
  driveMetadata?: any;
  driveFileId?: string;
}

interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  authorPhoto?: string;
  createdAt: any;
}

export const TrekDetail: React.FC<{ trek: Trek; onClose: () => void }> = ({ trek, onClose }) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isSubmittingPhotos, setIsSubmittingPhotos] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotoFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const photosQ = query(collection(db, 'treks', trek.id, 'photos'), orderBy('createdAt', 'desc'));
    const commentsQ = query(collection(db, 'treks', trek.id, 'comments'), orderBy('createdAt', 'asc'));

    const unsubPhotos = onSnapshot(photosQ, (s) => {
      setPhotos(s.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
      setLoadingPhotos(false);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `treks/${trek.id}/photos`);
      setLoadingPhotos(false);
    });

    const unsubComments = onSnapshot(commentsQ, (s) => {
      setComments(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, `treks/${trek.id}/comments`));

    return () => { unsubPhotos(); unsubComments(); };
  }, [trek.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      await addDoc(collection(db, 'treks', trek.id, 'comments'), {
        text: newComment,
        trekId: trek.id,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      toast.success('Bình luận đã được gửi!');
      setNewComment('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `treks/${trek.id}/comments`);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!photoUrl.trim() && photoFiles.length === 0)) return;

    setIsSubmittingPhotos(true);
    setUploadProgress({ current: 0, total: photoFiles.length + (photoUrl.trim() ? 1 : 0) });
    
    try {
      let completed = 0;

      // Handle URL upload if present
      if (photoUrl.trim()) {
        const finalPhotoUrl = formatDriveUrl(photoUrl);
        await addDoc(collection(db, 'treks', trek.id, 'photos'), {
          url: finalPhotoUrl,
          caption: photoCaption,
          trekId: trek.id,
          authorId: user.uid,
          authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          createdAt: serverTimestamp()
        });
        completed++;
        setUploadProgress(prev => prev ? { ...prev, current: completed } : null);
      }

      // Handle multiple file uploads sequentially to avoid getting stuck
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const path = `treks/${trek.id}/${Date.now()}_${file.name}`;
          const url = await uploadFile(file, path);
          await addDoc(collection(db, 'treks', trek.id, 'photos'), {
            url,
            caption: photoCaption,
            trekId: trek.id,
            authorId: user.uid,
            authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            createdAt: serverTimestamp()
          });
          completed++;
          setUploadProgress(prev => prev ? { ...prev, current: completed } : null);
        }
      }

      setPhotoUrl('');
      setPhotoCaption('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setIsUploading(false);
      toast.success('Ảnh đã được tải lên!');
    } catch (e) {
      console.error("Upload failed:", e);
      handleFirestoreError(e, OperationType.CREATE, `treks/${trek.id}/photos`);
    } finally {
      setIsSubmittingPhotos(false);
      setUploadProgress(null);
    }
  };

  const handleDriveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    
    if (!driveFolderId.trim()) return;
    if (!apiKey) {
      setDriveError("Chưa cấu hình API Key. Vui lòng thêm VITE_GOOGLE_DRIVE_API_KEY vào Settings.");
      return;
    }

    setIsSubmittingPhotos(true);
    setDriveError(null);

    try {
      const folderId = extractFolderId(driveFolderId.trim());
      const drivePhotos = await fetchDriveFolderImages(folderId, apiKey);
      
      if (drivePhotos.length === 0) {
        setDriveError("Không tìm thấy ảnh nào trong thư mục này. Hãy chắc chắn thư mục đã được chia sẻ công khai.");
        setIsSubmittingPhotos(false);
        return;
      }

      setUploadProgress({ current: 0, total: drivePhotos.length });
      let completed = 0;

      for (const photo of drivePhotos) {
        await addDoc(collection(db, 'treks', trek.id, 'photos'), {
          url: photo.url,
          caption: photo.name,
          trekId: trek.id,
          authorId: user?.uid,
          authorName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
          driveFileId: photo.id,
          driveMetadata: photo.metadata || null,
          driveLink: `https://drive.google.com/file/d/${photo.id}/view`,
          createdAt: serverTimestamp()
        });
        completed++;
        setUploadProgress({ current: completed, total: drivePhotos.length });
      }

      setDriveFolderId('');
      setShowDriveImport(false);
      setIsUploading(false);
      toast.success('Ảnh từ Drive đã được nhập!');
    } catch (err: any) {
      setDriveError(err.message || "Lỗi khi nhập ảnh từ Drive.");
    } finally {
      setIsSubmittingPhotos(false);
      setUploadProgress(null);
    }
  };
  const handleDeleteTrek = async () => {
    if (!user || user.uid !== trek.authorId) return;

    try {
      await deleteDoc(doc(db, 'treks', trek.id));
      toast.success('Chuyến đi đã bị xóa!');
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `treks/${trek.id}`);
    }
  };

  const handleDeletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.uid !== trek.authorId) return;
    if (photo.driveFileId) return; // Prevent deleting Drive photos
    
    try {
      await deleteDoc(doc(db, 'treks', trek.id, 'photos', photo.id));
      toast.success('Ảnh đã bị xóa!');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `treks/${trek.id}/photos/${photo.id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-[#0a0a0a] overflow-y-auto selection:bg-emerald-500/30"
    >
      <button 
        onClick={onClose}
        className="fixed top-6 right-6 z-[70] w-10 h-10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/10 backdrop-blur-md"
      >
        <X size={18} />
      </button>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Simplified Hero Section */}
        <header className="mb-16 space-y-8">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <MapPin size={12} />
              <span>{trek.location}</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-serif italic text-white leading-tight"
            >
              {trek.title}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-4 text-stone-500 text-[10px] uppercase tracking-widest font-mono border-b border-white/5 pb-8"
          >
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-emerald-500/50" />
              <span>{formatDate(trek.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={12} className="text-emerald-500/50" />
              <span>{trek.authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera size={12} className="text-emerald-500/50" />
              <span>{photos.length} Visuals</span>
            </div>
            {user?.uid === trek.authorId && (
              <button 
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="ml-auto text-red-500/60 hover:text-red-500 transition-colors"
              >
                {showDeleteConfirm ? 'Confirm Delete?' : 'Remove Trek'}
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex gap-4 ml-4">
                <button onClick={handleDeleteTrek} className="text-red-500 hover:underline">Yes</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-stone-400">No</button>
              </div>
            )}
          </motion.div>
        </header>

        {/* Main Content Area */}
        <div className="space-y-20">
          {/* Cover Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="aspect-[21/9] rounded-3xl overflow-hidden border border-white/5 bg-stone-900"
          >
            <img 
              src={trek.coverImage || `https://picsum.photos/seed/${trek.id}/1600/900`} 
              alt="Cover" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* Description & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-8">
              <p className="text-stone-300 text-xl leading-relaxed font-light font-serif">
                {trek.description}
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-600 border-b border-white/5 pb-4">Trek Specifications</h4>
              <div className="space-y-4">
                {[
                  { label: 'Terrain', value: trek.specifications?.terrain || 'N/A' },
                  { label: 'Elevation', value: trek.specifications?.elevation || 'N/A' },
                  { label: 'Intensity', value: trek.specifications?.intensity || 'N/A' },
                  { label: 'Duration', value: trek.specifications?.duration || 'N/A' }
                ].map((stat, i) => (
                  <div key={i} className="flex justify-between items-end">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500">{stat.label}</span>
                    <div className="flex-1 border-b border-white/5 mx-4 mb-1 border-dotted" />
                    <span className="text-sm text-stone-200 font-mono">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visuals Grid */}
          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-serif italic text-white">Visuals</h3>
              {user && (
                <div className="flex gap-6">
                  <button 
                    onClick={() => setShowDriveImport(!showDriveImport)}
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-500 hover:text-emerald-500 transition-colors"
                  >
                    Drive Import
                  </button>
                  <button 
                    onClick={() => setIsUploading(!isUploading)}
                    className="text-[10px] uppercase tracking-widest font-bold text-stone-500 hover:text-emerald-500 transition-colors"
                  >
                    + Add Photos
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showDriveImport && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleDriveImport}
                  className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4"
                >
                  <input 
                    type="text" 
                    placeholder="Google Drive Folder URL"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/30"
                  />
                  <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                    {isSubmittingPhotos ? 'Importing...' : 'Start Import'}
                  </button>
                </motion.form>
              )}

              {isUploading && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddPhoto}
                  className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4"
                >
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {photoPreviews.map((p, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={p} className="w-full h-full object-cover" />
                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 rounded-full p-1"><X size={10} /></button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5">
                      <Upload size={20} className="text-stone-500" />
                      <input type="file" multiple onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                  <input 
                    type="url" 
                    placeholder="Or Image URL"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/30"
                  />
                  <button type="submit" className="w-full bg-white text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                    {isSubmittingPhotos ? 'Uploading...' : 'Archive Assets'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.slice(0, displayLimit).map((photo, i) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedPhotoIndex(i)}
                  className="aspect-square rounded-2xl overflow-hidden bg-stone-900 group relative cursor-pointer"
                >
                  <img src={photo.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {user?.uid === trek.authorId && !photo.driveFileId && (
                      <button onClick={(e) => handleDeletePhoto(photo, e)} className="p-2 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {photos.length > displayLimit && (
              <button onClick={() => setDisplayLimit(prev => prev + 12)} className="w-full py-4 text-stone-500 hover:text-white text-[10px] uppercase tracking-widest font-bold">
                Load More
              </button>
            )}
          </section>

          {/* Dialogue Section */}
          <section className="space-y-10 pt-20 border-t border-white/5">
            <h3 className="text-3xl font-serif italic text-white">Dialogue</h3>
            
            <div className="max-w-2xl space-y-10">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-6">
                  <div className="w-10 h-10 rounded-full bg-stone-900 border border-white/10 flex-shrink-0 overflow-hidden">
                    {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-stone-700" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{comment.authorName}</span>
                      <span className="text-[8px] text-stone-700 font-mono">{comment.createdAt?.toDate ? formatDate(comment.createdAt.toDate().toISOString()) : ''}</span>
                    </div>
                    <p className="text-stone-300 font-light leading-relaxed">{comment.text}</p>
                  </div>
                </div>
              ))}

              {user ? (
                <form onSubmit={handleAddComment} className="flex gap-4 items-end">
                  <textarea 
                    placeholder="Add to the dialogue..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                    rows={1}
                  />
                  <button type="submit" className="p-2 text-emerald-500 hover:text-emerald-400 transition-colors">
                    <Send size={20} />
                  </button>
                </form>
              ) : (
                <p className="text-stone-600 text-[10px] uppercase tracking-widest">Login to comment</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <button className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-[110]">
              <X size={32} />
            </button>

            <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
              <img 
                src={selectedPhotoIndex === -1 ? (trek.coverImage || `https://picsum.photos/seed/${trek.id}/1600/900`) : photos[selectedPhotoIndex].url} 
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              
              <div className="mt-8 text-center space-y-4">
                <div className="space-y-1">
                  <p className="text-white text-2xl font-serif italic">
                    {selectedPhotoIndex === -1 ? "Cover Image" : (photos[selectedPhotoIndex].caption || "Untitled Capture")}
                  </p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-[0.3em]">
                    {selectedPhotoIndex === -1 ? 0 : selectedPhotoIndex + 1} / {photos.length}
                  </p>
                </div>

                {selectedPhotoIndex !== -1 && photos[selectedPhotoIndex].driveLink && (
                  <div className="flex flex-col items-center gap-4">
                    <a 
                      href={photos[selectedPhotoIndex].driveLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-500 hover:text-emerald-400 uppercase tracking-widest font-bold border border-emerald-500/30 px-4 py-2 rounded-full transition-all"
                    >
                      View Original on Drive
                    </a>
                    
                    {photos[selectedPhotoIndex].driveMetadata && (
                      <div className="flex gap-6 text-[9px] text-stone-500 font-mono uppercase tracking-tighter">
                        {photos[selectedPhotoIndex].driveMetadata.width && (
                          <span>{photos[selectedPhotoIndex].driveMetadata.width}x{photos[selectedPhotoIndex].driveMetadata.height}</span>
                        )}
                        {photos[selectedPhotoIndex].driveMetadata.cameraMake && (
                          <span>{photos[selectedPhotoIndex].driveMetadata.cameraMake} {photos[selectedPhotoIndex].driveMetadata.cameraModel}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
                <button 
                  disabled={selectedPhotoIndex <= -1}
                  onClick={() => setSelectedPhotoIndex(prev => prev !== null ? prev - 1 : null)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white pointer-events-auto disabled:opacity-0 transition-all"
                >
                  <ArrowUpRight size={20} className="rotate-[225deg]" />
                </button>
                <button 
                  disabled={selectedPhotoIndex >= photos.length - 1}
                  onClick={() => setSelectedPhotoIndex(prev => prev !== null ? prev + 1 : null)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white pointer-events-auto disabled:opacity-0 transition-all"
                >
                  <ArrowUpRight size={20} className="rotate-45" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
