import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, StopIcon, AnalyzeIcon, HeartRateIcon, BloodPressureIcon } from './Icons';

interface QueryInputProps {
  onAnalyze: (bpm: number) => void;
  onAnalyzeBloodPressure: (systolic: number, diastolic: number) => void;
  isLoading: boolean;
}

const MEASUREMENT_DURATION_S = 20; // 20 seconds for measurement
const FPS = 30;

const QueryInput: React.FC<QueryInputProps> = ({ onAnalyze, onAnalyzeBloodPressure, isLoading }) => {
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [bpm, setBpm] = useState(0);
    const [finalBpm, setFinalBpm] = useState<number | null>(null);
    const [statusMessage, setStatusMessage] = useState("Click 'Start Measurement' to begin.");
    const [secondsLeft, setSecondsLeft] = useState(MEASUREMENT_DURATION_S);
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const dataPointsRef = useRef<number[]>([]);
    const lastPeakTimeRef = useRef<number>(0);
    const peakIntervalsRef = useRef<number[]>([]);
    const timerRef = useRef<number | null>(null);

    const stopMeasurement = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsMeasuring(false);

        if (peakIntervalsRef.current.length > 2) {
            const avgInterval = peakIntervalsRef.current.slice(-10).reduce((a, b) => a + b, 0) / peakIntervalsRef.current.slice(-10).length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            if (calculatedBpm > 40 && calculatedBpm < 200) {
                 setFinalBpm(calculatedBpm);
                 setStatusMessage(`Measurement Complete. Your estimated pulse is ${calculatedBpm} BPM.`);
            } else {
                setStatusMessage("Could not get a stable reading. Please try again in a well-lit room.");
                setFinalBpm(null);
            }
        } else {
            setStatusMessage("Measurement stopped. Not enough data for a reading.");
            setFinalBpm(null);
        }
        setBpm(0);
    }, []);
    
    const processFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let redSum = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            redSum += imageData[i];
        }
        const redAverage = redSum / (imageData.length / 4);

        dataPointsRef.current.push(redAverage);
        if (dataPointsRef.current.length > FPS * 5) { // Keep last 5 seconds of data
            dataPointsRef.current.shift();
        }

        const windowSize = 5;
        if (dataPointsRef.current.length > windowSize * 2 + 1) {
            const centerIndex = dataPointsRef.current.length - 1 - windowSize;
            const centerValue = dataPointsRef.current[centerIndex];
            const isPeak = dataPointsRef.current.slice(centerIndex - windowSize, centerIndex + windowSize + 1)
                .every(val => centerValue >= val);
            
            const currentTime = Date.now();
            if (isPeak && (currentTime - lastPeakTimeRef.current > 300)) { 
                 if(lastPeakTimeRef.current > 0){
                     peakIntervalsRef.current.push(currentTime - lastPeakTimeRef.current);
                     if(peakIntervalsRef.current.length > 20) peakIntervalsRef.current.shift();
                 }
                lastPeakTimeRef.current = currentTime;
            }
        }
        
        if (peakIntervalsRef.current.length > 2) {
            const avgInterval = peakIntervalsRef.current.slice(-5).reduce((a, b) => a + b, 0) / peakIntervalsRef.current.slice(-5).length;
            setBpm(Math.round(60000 / avgInterval));
        }

        animationFrameIdRef.current = requestAnimationFrame(processFrame);
    }, []);

    const handleStartClick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: FPS }
                }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => {
                   animationFrameIdRef.current = requestAnimationFrame(processFrame);
                };
            }
            
            setIsMeasuring(true);
            setFinalBpm(null);
            setStatusMessage("Measuring... Please hold still.");
            setSecondsLeft(MEASUREMENT_DURATION_S);
            dataPointsRef.current = [];
            peakIntervalsRef.current = [];
            lastPeakTimeRef.current = 0;

            timerRef.current = window.setInterval(() => {
                setSecondsLeft(prev => prev - 1);
            }, 1000);

            setTimeout(stopMeasurement, MEASUREMENT_DURATION_S * 1000);

        } catch (error) {
            console.error("Camera access denied:", error);
            setStatusMessage("Camera access is required. Please enable camera permissions and try again.");
            setIsMeasuring(false);
        }
    };
    
    const handleBloodPressureAnalysis = () => {
        const sys = parseInt(systolic, 10);
        const dia = parseInt(diastolic, 10);
        if (sys > 0 && dia > 0) {
            onAnalyzeBloodPressure(sys, dia);
        }
    }

    useEffect(() => {
        return () => {
            stopMeasurement();
        };
    }, [stopMeasurement]);

    return (
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-sm aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-inner">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    {!isMeasuring && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <CameraIcon className="h-16 w-16 text-white/50" />
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>

                <div className="text-center h-20 flex flex-col justify-center items-center">
                    {isMeasuring ? (
                        <>
                            <div className="flex items-end gap-2">
                               <HeartRateIcon className="h-10 w-10 text-red-500 animate-pulse" />
                               <span className="text-5xl font-bold text-gray-800 tracking-tighter w-28 text-left">{bpm > 30 ? bpm : '--'}</span>
                               <span className="text-xl font-semibold text-gray-500 mb-1">BPM</span>
                            </div>
                            <p className="font-semibold text-cyan-600">Time remaining: {secondsLeft}s</p>
                        </>
                    ) : (
                        <p className="font-semibold text-gray-600">{statusMessage}</p>
                    )}
                </div>

                <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4">
                    {!isMeasuring ? (
                        <button
                            onClick={handleStartClick}
                            disabled={isLoading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg shadow-md hover:bg-cyan-700 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105"
                        >
                            <CameraIcon className="h-5 w-5" />
                            Start Measurement
                        </button>
                    ) : (
                        <button
                            onClick={stopMeasurement}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
                        >
                            <StopIcon className="h-5 w-5" />
                            Stop
                        </button>
                    )}
                    
                    {finalBpm && (
                        <button
                          onClick={() => onAnalyze(finalBpm)}
                          disabled={isLoading}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105"
                        >
                          {isLoading ? (
                             <>
                               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               Analyzing...
                             </>
                           ) : (
                             <>
                               <AnalyzeIcon className="h-5 w-5" />
                               Get Insights for {finalBpm} BPM
                             </>
                           )}
                        </button>
                    )}
                </div>
            </div>

            <hr className="my-6 border-t border-gray-300" />

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <BloodPressureIcon className="h-7 w-7 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-700 text-center">Or, Enter Blood Pressure Manually</h3>
              </div>
              <div className="w-full max-w-md grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="systolic" className="block text-sm font-medium text-gray-600">Systolic (Top #)</label>
                  <input
                    type="number"
                    id="systolic"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="e.g., 120"
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="diastolic" className="block text-sm font-medium text-gray-600">Diastolic (Bottom #)</label>
                  <input
                    type="number"
                    id="diastolic"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="e.g., 80"
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleBloodPressureAnalysis}
                disabled={isLoading || !systolic || !diastolic}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <AnalyzeIcon className="h-5 w-5" />
                    Analyze Blood Pressure
                  </>
                )}
              </button>
            </div>
        </div>
    );
};

export default QueryInput;