import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import QueryInput from './components/QueryInput';
import ResultDisplay from './components/ResultDisplay';
import { getHealthResult } from './services/geminiService';

const App: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = useCallback(async (bpm: number) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult('');

    // Create a prompt from the measured BPM
    const prompt = `Please provide health insights for a resting pulse rate of ${bpm} bpm.`;

    try {
      const apiResult = await getHealthResult(prompt);
      setResult(apiResult);
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection or API key and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleBloodPressureAnalysis = useCallback(async (systolic: number, diastolic: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setResult('');

    const prompt = `Please provide health insights for a blood pressure reading of ${systolic}/${diastolic} mmHg.`;

    try {
      const apiResult = await getHealthResult(prompt);
      setResult(apiResult);
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection or API key and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-200 font-sans text-gray-800">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <div className="text-center text-gray-600 md:text-lg">
             <p>This tool uses your device's camera to estimate your heart rate or analyzes your manually entered blood pressure.</p>
             <p className="mt-2">For a pulse reading, place your fingertip gently over the rear camera lens, covering it completely.</p>
             <p className="mt-4"><strong className="font-semibold text-red-600">This is not a medical device. Consult a doctor for medical advice.</strong></p>
          </div>
          <QueryInput
            onAnalyze={handleAnalysis}
            onAnalyzeBloodPressure={handleBloodPressureAnalysis}
            isLoading={isLoading}
          />
          <ResultDisplay
            result={result}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-gray-500">
         <p>
            Note: Blood pressure measurement is not possible with a standard phone camera. Please use a dedicated medical device for accurate readings.
        </p>
        <p className="mt-2">&copy; {new Date().getFullYear()} Live Pulse Rate Monitor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;