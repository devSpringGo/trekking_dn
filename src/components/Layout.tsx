import React from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, LogOut, Map, Camera, User } from 'lucide-react';
import { motion } from 'motion/react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-stone-900 font-sans selection:bg-stone-200">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white">
              <Map size={20} />
            </div>
            <div>
              <h1 className="text-xl font-serif italic font-bold leading-none">Da Nang</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-medium">Trekking Gallery</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-stone-600">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-stone-200" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={18} />
                  )}
                  <span>{user.displayName}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-stone-500 hover:text-stone-900 transition-all p-2.5"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="bg-stone-900 text-white p-2.5 rounded-full hover:bg-stone-800 transition-all shadow-sm hover:shadow-md"
              >
                <LogIn size={18} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-stone-200 py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-serif italic mb-2">Lưu giữ từng bước chân.</h2>
            <p className="text-stone-500 text-sm max-w-md">
              Cộng đồng trekking Đà Nẵng - Nơi chia sẻ những khoảnh khắc tuyệt vời trên những cung đường mòn.
            </p>
          </div>
          <div className="text-stone-400 text-xs uppercase tracking-widest">
            © 2026 Da Nang Trekking Gallery
          </div>
        </div>
      </footer>
    </div>
  );
};
