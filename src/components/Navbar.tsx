import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type WorkspaceSection =
  | 'overview'
  | 'atmosphere'
  | 'map'
  | 'analytics'
  | 'iot';

interface NavbarProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'atmosphere', label: 'Gas & AQI' },
  { id: 'map', label: 'Spatial Map' },
  { id: 'analytics', label: 'ML Analytics' },
  { id: 'iot', label: 'ESP32 IoT' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#070B14]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection('overview');
        }}
        className="text-lg font-display font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
      >
        AtmosphereX
      </a>

      {/* Zone 2: 5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-cyan-400'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action (Google Authentication) */}
      <div className="relative flex items-center shrink-0" ref={menuRef}>
        {loading ? (
          <div className="h-9 w-36 rounded-lg bg-slate-800/60 animate-pulse" />
        ) : user ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0D1424] border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Authenticated user'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-[11px]">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
              )}
              <span className="max-w-[140px] truncate">
                {user.displayName || user.email || 'Account'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#0D1424] border border-slate-800 shadow-2xl p-3 z-50">
                <div className="pb-2.5 mb-2.5 border-b border-slate-800/80">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {user.displayName || 'Google Account'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOutUser();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-slate-800/70 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
              />
            </svg>
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  );
};
