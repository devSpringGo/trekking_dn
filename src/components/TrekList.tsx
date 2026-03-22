import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError } from '../firebase';
import { TrekCard } from './TrekCard';
import { motion } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../AuthContext';

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

export const TrekList: React.FC<{ onSelectTrek: (trek: Trek) => void; onAddTrek: () => void }> = ({ onSelectTrek, onAddTrek }) => {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'treks'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trekData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trek));
      setTreks(trekData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'treks');
    });

    return unsubscribe;
  }, []);

  const filteredTreks = treks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif italic leading-tight mb-6"
          >
            Khám phá <br /> Đà Nẵng hoang sơ.
          </motion.h2>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm địa điểm hoặc chuyến đi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all text-sm"
            />
          </div>
        </div>

        {user && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddTrek}
            className="flex items-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl font-medium shadow-lg shadow-stone-900/10 hover:bg-stone-800 transition-all"
          >
            <Plus size={20} />
            <span>Tạo chuyến đi mới</span>
          </motion.button>
        )}
      </header>

      {filteredTreks.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-stone-300">
          <p className="text-stone-500 italic">Chưa có chuyến đi nào được tìm thấy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTreks.map((trek, index) => (
            <TrekCard key={trek.id} trek={trek} index={index} onClick={() => onSelectTrek(trek)} />
          ))}
        </div>
      )}
    </div>
  );
};
