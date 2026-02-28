import { useState, useRef } from 'react';

export const useCamera = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStreamRef = useRef<Promise<MediaStream> | null>(null);

  const startCamera = async () => {
    if (isInitializing || cameraActive) {
      return; // Prevent multiple camera initialization attempts
    }
    
    try {
      setIsInitializing(true);
      
      const streamPromise = navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      
      pendingStreamRef.current = streamPromise;
      const stream = await streamPromise;
      
      // Check if component is still mounted and we haven't called stopCamera
      if (pendingStreamRef.current === streamPromise) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } else {
        // Camera was stopped while initializing, clean up the stream
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      throw new Error('Camera access is required for skin analysis');
    } finally {
      setIsInitializing(false);
      pendingStreamRef.current = null;
    }
  };

  const stopCamera = () => {
    // Stop any pending stream request
    pendingStreamRef.current = null;
    
    // Stop current stream if it exists
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setIsInitializing(false);
  };

  return {
    cameraActive,
    isInitializing,
    videoRef,
    canvasRef,
    overlayCanvasRef,
    streamRef,
    startCamera,
    stopCamera
  };
};