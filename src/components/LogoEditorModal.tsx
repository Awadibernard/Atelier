import { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Square,
  Circle,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
} from 'lucide-react';

export type LogoMaskShape = 'original' | 'square' | 'circle' | 'rounded';

interface Props {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

export function LogoEditorModal({ isOpen, imageSrc, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maskShape, setMaskShape] = useState<LogoMaskShape>('original');
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [bgColor, setBgColor] = useState<'transparent' | 'white' | 'dark'>('transparent');
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 360;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw background if not transparent
    if (bgColor === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else if (bgColor === 'dark') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);
    }

    // Apply clipping mask
    ctx.save();
    const pad = 20;
    const boxSize = width - pad * 2; // 320x320

    if (maskShape === 'circle') {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, boxSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else if (maskShape === 'square') {
      ctx.beginPath();
      ctx.rect(pad, pad, boxSize, boxSize);
      ctx.closePath();
      ctx.clip();
    } else if (maskShape === 'rounded') {
      const radius = 32;
      ctx.beginPath();
      ctx.moveTo(pad + radius, pad);
      ctx.lineTo(pad + boxSize - radius, pad);
      ctx.quadraticCurveTo(pad + boxSize, pad, pad + boxSize, pad + radius);
      ctx.lineTo(pad + boxSize, pad + boxSize - radius);
      ctx.quadraticCurveTo(pad + boxSize, pad + boxSize, pad + boxSize - radius, pad + boxSize);
      ctx.lineTo(pad + radius, pad + boxSize);
      ctx.quadraticCurveTo(pad, pad + boxSize, pad, pad + boxSize - radius);
      ctx.lineTo(pad, pad + radius);
      ctx.quadraticCurveTo(pad, pad, pad + radius, pad);
      ctx.closePath();
      ctx.clip();
    }

    // Calculate image base scale to fit
    const imgAspect = imageObj.width / imageObj.height;
    let baseWidth = boxSize;
    let baseHeight = boxSize;

    if (imgAspect > 1) {
      baseHeight = boxSize / imgAspect;
    } else {
      baseWidth = boxSize * imgAspect;
    }

    const drawW = baseWidth * zoom;
    const drawH = baseHeight * zoom;
    const drawX = width / 2 - drawW / 2 + offsetX;
    const drawY = height / 2 - drawH / 2 + offsetY;

    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Draw visual guide border over the canvas
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    if (maskShape === 'circle') {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, boxSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (maskShape === 'square') {
      ctx.strokeRect(pad, pad, boxSize, boxSize);
    } else if (maskShape === 'rounded') {
      const radius = 32;
      ctx.beginPath();
      ctx.moveTo(pad + radius, pad);
      ctx.lineTo(pad + boxSize - radius, pad);
      ctx.quadraticCurveTo(pad + boxSize, pad, pad + boxSize, pad + radius);
      ctx.lineTo(pad + boxSize, pad + boxSize - radius);
      ctx.quadraticCurveTo(pad + boxSize, pad + boxSize, pad + boxSize - radius, pad + boxSize);
      ctx.lineTo(pad + radius, pad + boxSize);
      ctx.quadraticCurveTo(pad, pad + boxSize, pad, pad + boxSize - radius);
      ctx.lineTo(pad, pad + radius);
      ctx.quadraticCurveTo(pad, pad, pad + radius, pad);
      ctx.stroke();
    }
  }, [imageObj, maskShape, zoom, offsetX, offsetY, bgColor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse / Touch handlers for pan/drag
  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { x: offsetX, y: offsetY };
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffsetX(offsetStartRef.current.x + dx);
    setOffsetY(offsetStartRef.current.y + dy);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStartRef.current = { x: offsetX, y: offsetY };
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffsetX(offsetStartRef.current.x + dx);
    setOffsetY(offsetStartRef.current.y + dy);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Generate final cropped output
  const handleExportAndConfirm = () => {
    if (!imageObj) return;

    // Create an offscreen render canvas sized 400x400
    const outCanvas = document.createElement('canvas');
    const outSize = 360;
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.clearRect(0, 0, outSize, outSize);

    if (bgColor === 'white') {
      outCtx.fillStyle = '#FFFFFF';
      outCtx.fillRect(0, 0, outSize, outSize);
    } else if (bgColor === 'dark') {
      outCtx.fillStyle = '#0F172A';
      outCtx.fillRect(0, 0, outSize, outSize);
    }

    outCtx.save();
    const pad = maskShape === 'original' ? 0 : 16;
    const boxSize = outSize - pad * 2;

    if (maskShape === 'circle') {
      outCtx.beginPath();
      outCtx.arc(outSize / 2, outSize / 2, boxSize / 2, 0, Math.PI * 2);
      outCtx.closePath();
      outCtx.clip();
    } else if (maskShape === 'square') {
      outCtx.beginPath();
      outCtx.rect(pad, pad, boxSize, boxSize);
      outCtx.closePath();
      outCtx.clip();
    } else if (maskShape === 'rounded') {
      const radius = 32;
      outCtx.beginPath();
      outCtx.moveTo(pad + radius, pad);
      outCtx.lineTo(pad + boxSize - radius, pad);
      outCtx.quadraticCurveTo(pad + boxSize, pad, pad + boxSize, pad + radius);
      outCtx.lineTo(pad + boxSize, pad + boxSize - radius);
      outCtx.quadraticCurveTo(pad + boxSize, pad + boxSize, pad + boxSize - radius, pad + boxSize);
      outCtx.lineTo(pad + radius, pad + boxSize);
      outCtx.quadraticCurveTo(pad, pad + boxSize, pad, pad + boxSize - radius);
      outCtx.lineTo(pad, pad + radius);
      outCtx.quadraticCurveTo(pad, pad, pad + radius, pad);
      outCtx.closePath();
      outCtx.clip();
    }

    const imgAspect = imageObj.width / imageObj.height;
    let baseWidth = boxSize;
    let baseHeight = boxSize;

    if (imgAspect > 1) {
      baseHeight = boxSize / imgAspect;
    } else {
      baseWidth = boxSize * imgAspect;
    }

    const drawW = baseWidth * zoom;
    const drawH = baseHeight * zoom;
    const drawX = outSize / 2 - drawW / 2 + offsetX;
    const drawY = outSize / 2 - drawH / 2 + offsetY;

    outCtx.drawImage(imageObj, drawX, drawY, drawW, drawH);
    outCtx.restore();

    // Export as optimized PNG
    const finalDataUrl = outCanvas.toDataURL('image/png', 0.9);
    onConfirm(finalDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base">Ajuster et Cadrer le Logo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Canvas Viewport */}
          <div className="flex flex-col items-center">
            <div className="relative p-2 bg-slate-100 rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center select-none touch-none">
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] cursor-grab active:cursor-grabbing rounded-xl bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"
              />
              <div className="absolute bottom-3.5 right-3.5 px-2 py-1 bg-slate-900/80 text-white text-[10px] rounded-md font-mono flex items-center gap-1">
                <Move className="w-3 h-3" />
                <span>Glisser pour ajuster</span>
              </div>
            </div>
          </div>

          {/* Shape Mask Options */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Forme du cadre / Masque :
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'original', label: 'Original', icon: Maximize2 },
                { id: 'square', label: 'Carré', icon: Square },
                { id: 'rounded', label: 'Arrondi', icon: Layers },
                { id: 'circle', label: 'Cercle', icon: Circle },
              ].map((s) => {
                const Icon = s.icon;
                const active = maskShape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMaskShape(s.id as LogoMaskShape)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      active
                        ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-teal-600" />
                Échelle / Zoom :
              </span>
              <span className="font-mono text-slate-500 font-bold">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-teal-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Background fill */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">Fond du logo :</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'transparent', label: 'Transparent' },
                { id: 'white', label: 'Blanc' },
                { id: 'dark', label: 'Sombre' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBgColor(bg.id as 'transparent' | 'white' | 'dark')}
                  className={`px-2.5 py-1 rounded-lg font-medium text-[11px] border transition-colors ${
                    bgColor === bg.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setOffsetX(0);
              setOffsetY(0);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
          >
            Réinitialiser cadrage
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleExportAndConfirm}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Valider le logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
