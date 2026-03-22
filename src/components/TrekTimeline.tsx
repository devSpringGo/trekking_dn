import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Calendar } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError } from '../firebase';

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

export const TrekTimeline: React.FC<{ onSelectTrek: (trek: Trek) => void }> = ({ onSelectTrek }) => {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'treks'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trekData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trek));
      setTreks(trekData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'treks');
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="text-center py-24">Đang tải...</div>;
  }

  return (
    <div className="relative max-w-2xl mx-auto py-8">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-200" />
      
      <div className="space-y-6">
        {treks.map((trek, index) => (
          <motion.div 
            key={trek.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative pl-10"
          >
            <div className="absolute left-4 -translate-x-1/2 w-3 h-3 bg-stone-400 rounded-full border-2 border-white" />
            
            <motion.div 
              whileHover={{ x: 4 }}
              onClick={() => onSelectTrek(trek)}
              className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 cursor-pointer hover:border-stone-300 transition-all"
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium text-stone-900">{trek.title}</h3>
                <span className="text-[10px] text-stone-500 font-mono">
                  {new Date(trek.date).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <p className="text-xs text-stone-600 flex items-center gap-1">
                <MapPin size={12} />
                {trek.location}
              </p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
