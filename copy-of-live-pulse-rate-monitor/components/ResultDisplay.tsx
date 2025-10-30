import React from 'react';
import Loader from './Loader';

interface ResultDisplayProps {
  result: string;
  isLoading: boolean;
  error: string | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading, error }) => {
  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      );
    }
    if (result) {
      // Simple Markdown-like formatter for bold text
      const formattedResult = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <div>
          <h2 className="text-xl font-bold mb-4 border-b pb-2 border-red-200 text-gray-800">AI Analysis Result</h2>
          <div 
             className="text-gray-700 space-y-2"
             dangerouslySetInnerHTML={{ __html: formattedResult.replace(/\n/g, '<br />') }}
           />
        </div>
      );
    }
    return (
      <div className="text-center text-gray-500 py-10">
        <p>Measure your pulse rate to get AI-powered health insights.</p>
      </div>
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-300 min-h-[200px] flex flex-col justify-center">
      {renderContent()}
    </div>
  );
};

export default ResultDisplay;
