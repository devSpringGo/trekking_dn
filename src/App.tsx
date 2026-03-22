/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { TrekList } from './components/TrekList';
import { TrekTimeline } from './components/TrekTimeline';
import { TrekDetail } from './components/TrekDetail';
import { AddTrekModal } from './components/AddTrekModal';
import { AnimatePresence } from 'motion/react';
import { List, TreeDeciduous } from 'lucide-react';

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

function AppContent() {
  const [selectedTrek, setSelectedTrek] = useState<Trek | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'timeline'>('list');

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="flex justify-end mb-8 gap-2">
        <button 
          onClick={() => setView('list')}
          className={`p-3 rounded-full transition-all ${view === 'list' ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'}`}
        >
          <List size={20} />
        </button>
        <button 
          onClick={() => setView('timeline')}
          className={`p-3 rounded-full transition-all ${view === 'timeline' ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'}`}
        >
          <TreeDeciduous size={20} />
        </button>
      </div>

      {view === 'list' ? (
        <TrekList 
          onSelectTrek={setSelectedTrek} 
          onAddTrek={() => setIsAddModalOpen(true)} 
        />
      ) : (
        <TrekTimeline 
          onSelectTrek={setSelectedTrek} 
        />
      )}
      
      <AnimatePresence>
        {selectedTrek && (
          <TrekDetail 
            trek={selectedTrek} 
            onClose={() => setSelectedTrek(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddTrekModal 
            onClose={() => setIsAddModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

