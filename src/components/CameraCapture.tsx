import { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCcw, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (blob: string) => void;
  isActive: boolean;
}

export function CameraCapture({ onCapture, isActive }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 }, 
        audio: false 
      });
      setStream(s);
    } catch (err: any) {
      console.error("Camera access denied", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera found on this device.");
      } else {
        setError(err.message || "Could not access camera.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isActive && !stream && !capturedImage && !error) {
      startCamera();
    }
    
    if (!isActive && stream) {
      stopCamera();
    }
  }, [isActive, stream, capturedImage, error]);

  // Ensure srcObject is set when videoRef becomes available
  useEffect(() => {
    if (videoRef.current && stream && !capturedImage) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play failed:", e));
    }
  }, [stream, capturedImage]);

  useEffect(() => {
    return () => stopCamera();
  }, [stream]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Small JPEG for Firestore limit safety
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    onCapture('');
  };

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-800 flex items-center justify-center">
        {error ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <button 
              onClick={startCamera}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry Access
            </button>
          </div>
        ) : !capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}
        
        {!error && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
              {!capturedImage ? (
                <button 
                  onClick={capture}
                  className="w-14 h-14 rounded-full bg-white text-brand-primary flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera className="w-6 h-6" />
                </button>
              ) : (
                <button 
                  onClick={reset}
                  className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {capturedImage && (
              <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      
      {!capturedImage && (
        <p className="text-[10px] text-center font-mono text-slate-400 uppercase tracking-widest animate-pulse">
           Visual Identification Required :: Frame Ready
        </p>
      )}
    </div>
  );
}
