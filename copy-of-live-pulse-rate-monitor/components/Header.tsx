import React from 'react';
import { HealthIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <HealthIcon className="h-8 w-8 text-cyan-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
            Live Pulse Rate Monitor
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
