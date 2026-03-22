import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Calendar, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../lib/utils';

interface Trek {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  coverImage?: string;
  authorName: string;
}

export const TrekCard: React.FC<{ trek: Trek; index: number; onClick: () => void }> = ({ trek, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-[2.5rem] bg-stone-200 relative shadow-sm group-hover:shadow-xl transition-all duration-500">
        <img 
          src={trek.coverImage || `https://picsum.photos/seed/${trek.id}/800/1200`} 
          alt={trek.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${trek.id}/800/1200`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        <div className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
          <ArrowUpRight size={20} />
        </div>

        <div className="absolute bottom-8 left-8 right-8 text-white">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-80 mb-2">
            <Calendar size={12} />
            <span>{formatDate(trek.date)}</span>
          </div>
          <h3 className="text-2xl font-serif italic mb-3 leading-tight">{trek.title}</h3>
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <MapPin size={14} className="text-emerald-400" />
            <span>{trek.location}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 px-2 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">By {trek.authorName}</span>
      </div>
    </motion.div>
  );
};
