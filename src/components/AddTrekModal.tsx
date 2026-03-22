import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { X, MapPin, Calendar, Type, AlignLeft, Image as ImageIcon, Upload } from 'lucide-react';
import { db, collection, addDoc, setDoc, doc, serverTimestamp, OperationType, handleFirestoreError, formatDriveUrl, uploadFile } from '../firebase';
import { useAuth } from '../AuthContext';

export const AddTrekModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [coverImage, setCoverImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [terrain, setTerrain] = useState('');
  const [elevation, setElevation] = useState('');
  const [intensity, setIntensity] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const trekRef = doc(collection(db, 'treks'));
      const trekId = trekRef.id;
      let finalImageUrl = formatDriveUrl(coverImage);
      
      if (imageFile) {
        toast.loading('Đang tải ảnh lên...', { id: 'upload-toast' });
        try {
          const path = `treks/${trekId}/${Date.now()}_${imageFile.name}`;
          finalImageUrl = await uploadFile(imageFile, path);
          toast.dismiss('upload-toast');
          toast.success('Ảnh đã được tải lên!');
        } catch (e) {
          toast.dismiss('upload-toast');
          toast.error('Lỗi khi tải ảnh lên!');
          throw e;
        }
      }

      await setDoc(trekRef, {
        title,
        description,
        location,
        date,
        coverImage: finalImageUrl || `https://picsum.photos/seed/${Date.now()}/1200/800`,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp(),
        specifications: {
          terrain,
          elevation,
          intensity,
          duration
        }
      });
      toast.success('Chuyến đi đã được tạo thành công!');
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'treks');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="px-10 py-8 border-b border-stone-100 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif italic">Tạo chuyến đi mới</h2>
            <p className="text-stone-400 text-sm">Chia sẻ hành trình của bạn với mọi người.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center hover:bg-stone-200 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
                <Type size={12} /> Tiêu đề
              </label>
              <input 
                required
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Chinh phục Đỉnh Bàn Cờ"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
                <MapPin size={12} /> Địa điểm
              </label>
              <input 
                required
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Bán đảo Sơn Trà"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
                <Calendar size={12} /> Ngày đi
              </label>
              <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
                <ImageIcon size={12} /> Ảnh bìa
              </label>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label 
                    htmlFor="cover-upload"
                    className="flex flex-col items-center justify-center w-full h-32 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-all overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-stone-400">
                        <Upload size={20} />
                        <span className="text-xs font-medium">Tải ảnh từ máy</span>
                      </div>
                    )}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ImageIcon size={14} className="text-stone-400" />
                  </div>
                  <input 
                    type="url" 
                    value={coverImage}
                    onChange={(e) => {
                      setCoverImage(e.target.value);
                      if (e.target.value) {
                        setImageFile(null);
                        setImagePreview(null);
                      }
                    }}
                    placeholder="Hoặc dán link ảnh (Drive, Web...)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
              <AlignLeft size={12} /> Mô tả chuyến đi
            </label>
            <textarea 
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kể về những trải nghiệm, khó khăn hay niềm vui trong chuyến đi..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Địa hình</label>
              <input type="text" value={terrain} onChange={(e) => setTerrain(e.target.value)} placeholder="Ví dụ: Rừng" className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Độ cao</label>
              <input type="text" value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder="Ví dụ: 1000m" className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Độ khó</label>
              <input type="text" value={intensity} onChange={(e) => setIntensity(e.target.value)} placeholder="Ví dụ: Cao" className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Thời gian</label>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ví dụ: 5h" className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang tạo...' : 'Đăng chuyến đi'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
