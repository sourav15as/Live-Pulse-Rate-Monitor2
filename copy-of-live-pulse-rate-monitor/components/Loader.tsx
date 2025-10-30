
import React from 'react';

const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-10">
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-lg font-semibold text-gray-600">Generating insights...</p>
  </div>
);

export default Loader;
