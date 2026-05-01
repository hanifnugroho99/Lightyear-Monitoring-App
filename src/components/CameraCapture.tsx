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

  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    } else if (!isActive && stream) {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

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
      <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-800">
        {!capturedImage ? (
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
