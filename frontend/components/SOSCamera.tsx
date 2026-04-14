'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const API = '';

interface DetectedFace {
  id: string;
  crop: string;       // base64 JPEG
  encoding: number[]; // 128-dim descriptor
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
  mediaId?: string;
  saved?: boolean;
  suspectMatch?: { suspect_id: string; alias: string | null; similarity: number };
}

interface SOSCameraProps {
  token: string;
  incidentId: string;
  coords: { lat: number; lng: number } | null;
  active: boolean;
  onFaceDetected?: (face: DetectedFace) => void;
  onClose: () => void;
}

let modelsLoaded = false;

export default function SOSCamera({ token, incidentId, coords, active, onFaceDetected, onClose }: SOSCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'capturing' | 'error'>('loading');
  const [error, setError] = useState('');
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [modelsReady, setModelsReady] = useState(modelsLoaded);

  // Load face-api models
  useEffect(() => {
    if (modelsLoaded) { setModelsReady(true); return; }
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        modelsLoaded = true;
        setModelsReady(true);
      } catch (err) {
        console.error('Failed to load face models:', err);
        setError('Error cargando modelos de detección facial');
        setStatus('error');
      }
    };
    load();
  }, []);

  // Start/stop camera based on active prop
  useEffect(() => {
    if (!active || !modelsReady) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
      } catch (err: any) {
        console.error('Camera error:', err);
        setError(err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Activa el acceso en configuración.'
          : 'No se pudo acceder a la cámara');
        setStatus('error');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [active, modelsReady]);

  // Capture a frame, detect faces, extract encodings
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    setFrameCount(p => p + 1);

    // Upload full frame
    const frameData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

    let mediaId: string | undefined;
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image_data: frameData,
          media_type: 'video_frame',
          latitude: coords?.lat,
          longitude: coords?.lng,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        mediaId = data.id;
      }
    } catch {}

    // Detect faces
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      for (const det of detections) {
        const { x, y, width, height } = det.detection.box;
        // Crop face from canvas
        const pad = Math.round(Math.max(width, height) * 0.3);
        const cx = Math.max(0, Math.round(x - pad));
        const cy = Math.max(0, Math.round(y - pad));
        const cw = Math.min(canvas.width - cx, Math.round(width + pad * 2));
        const ch = Math.min(canvas.height - cy, Math.round(height + pad * 2));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) continue;
        cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        const cropData = cropCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

        const encoding = Array.from(det.descriptor);
        const confidence = det.detection.score;

        // Check if this face is similar to one we already captured (avoid duplicates)
        const isDuplicate = faces.some(f => {
          let dot = 0, magA = 0, magB = 0;
          for (let i = 0; i < Math.min(f.encoding.length, encoding.length); i++) {
            dot += f.encoding[i] * encoding[i];
            magA += f.encoding[i] * f.encoding[i];
            magB += encoding[i] * encoding[i];
          }
          const sim = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
          return sim > 0.75; // same person threshold
        });
        if (isDuplicate) continue;

        const faceId = `face-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Save face to backend
        let matchInfo: DetectedFace['suspectMatch'];
        if (mediaId) {
          try {
            const faceRes = await fetch(`${API}/api/incidents/${incidentId}/faces`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                media_id: mediaId,
                face_crop: cropData,
                encoding,
                confidence,
                box: { x, y, w: width, h: height },
              }),
            });
            if (faceRes.ok) {
              const faceData = await faceRes.json();
              if (faceData.matches?.[0]) {
                matchInfo = faceData.matches[0];
              }
            }
          } catch {}
        }

        const newFace: DetectedFace = {
          id: faceId,
          crop: cropData,
          encoding,
          confidence,
          box: { x, y, w: width, h: height },
          mediaId,
          saved: !!mediaId,
          suspectMatch: matchInfo,
        };

        setFaces(prev => [...prev, newFace]);
        onFaceDetected?.(newFace);
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [token, incidentId, coords, faces, onFaceDetected]);

  // Start auto-capture
  const startCapture = useCallback(() => {
    setStatus('capturing');
    // Capture immediately, then every 3 seconds
    captureFrame();
    captureIntervalRef.current = setInterval(captureFrame, 3000);
  }, [captureFrame]);

  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setStatus('ready');
  }, []);

  // Mark a face as suspect
  const markSuspect = useCallback(async (face: DetectedFace) => {
    if (!face.mediaId) return;
    try {
      // First save the face if not already saved
      const faceRes = await fetch(`${API}/api/incidents/${incidentId}/faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          media_id: face.mediaId,
          face_crop: face.crop,
          encoding: face.encoding,
          confidence: face.confidence,
          box: face.box,
        }),
      });
      let faceDetectionId: string | undefined;
      if (faceRes.ok) {
        const data = await faceRes.json();
        faceDetectionId = data.id;
      }

      if (faceDetectionId) {
        const suspectRes = await fetch(`${API}/api/suspects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ face_detection_id: faceDetectionId }),
        });
        if (suspectRes.ok) {
          const suspect = await suspectRes.json();
          setFaces(prev => prev.map(f =>
            f.id === face.id ? { ...f, saved: true, suspectMatch: { suspect_id: suspect.id, alias: suspect.alias, similarity: suspect.linked_to_existing ? suspect.similarity : 1 } } : f
          ));
          return suspect;
        }
      }
    } catch (err) {
      console.error('Error marking suspect:', err);
    }
  }, [token, incidentId]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-2 flex items-center justify-between safe-area-top">
        <button onClick={onClose} className="text-sm font-medium flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Cerrar
        </button>
        <div className="flex items-center gap-2">
          {status === 'capturing' && <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />}
          <span className="text-xs font-bold uppercase tracking-wider">
            {status === 'loading' && 'Cargando cámara...'}
            {status === 'ready' && 'Cámara lista'}
            {status === 'capturing' && `Grabando · ${frameCount} frames`}
            {status === 'error' && 'Error'}
          </span>
        </div>
        <span className="text-[10px] text-red-200">{faces.length} rostros</span>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay: face detection boxes would go here in production */}
        {status === 'capturing' && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-red-600/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Capturando rostros automáticamente cada 3 segundos...
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center px-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="mx-auto mb-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <p className="text-red-400 text-sm font-medium mb-2">{error}</p>
              <button onClick={onClose} className="text-zinc-400 text-xs underline">Volver</button>
            </div>
          </div>
        )}

        {/* Suspect match alert */}
        {faces.some(f => f.suspectMatch) && (
          <div className="absolute bottom-3 left-3 right-3 bg-orange-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              <span className="font-bold text-sm">COINCIDENCIA CON SOSPECHOSO</span>
            </div>
            <p className="text-xs text-orange-100">
              Se detectó un rostro que coincide con un sospechoso registrado en el sistema.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 px-4 py-3 safe-area-bottom">
        {/* Capture button */}
        {status === 'ready' && (
          <button
            onClick={startCapture}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            Iniciar captura de rostros
          </button>
        )}

        {status === 'capturing' && (
          <div className="flex gap-2">
            <button
              onClick={stopCapture}
              className="flex-1 py-3 bg-zinc-700 text-white rounded-xl font-medium text-sm"
            >
              Pausar
            </button>
            <button
              onClick={captureFrame}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium text-sm"
            >
              Capturar ahora
            </button>
          </div>
        )}

        {/* Detected faces strip */}
        {faces.length > 0 && (
          <div className="mt-3">
            <p className="text-zinc-400 text-[10px] uppercase tracking-wider mb-2">
              Rostros detectados ({faces.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {faces.map((face) => (
                <div key={face.id} className="flex-shrink-0 relative">
                  <img
                    src={`data:image/jpeg;base64,${face.crop}`}
                    alt="Rostro detectado"
                    className={`w-16 h-16 rounded-lg object-cover border-2 ${
                      face.suspectMatch ? 'border-orange-500' : 'border-zinc-600'
                    }`}
                  />
                  {face.suspectMatch && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
                    </div>
                  )}
                  {!face.suspectMatch && (
                    <button
                      onClick={() => markSuspect(face)}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    >
                      Marcar
                    </button>
                  )}
                  <p className="text-[8px] text-zinc-500 text-center mt-0.5">
                    {Math.round(face.confidence * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
