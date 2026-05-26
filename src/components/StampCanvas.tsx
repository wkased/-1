import { useRef, useEffect, useState } from 'react';
import { Download, RefreshCw, ZoomIn, Square, Grid2X2 } from 'lucide-react';
import { StampConfig, POETRY_PRESETS } from '../types';
import { extractColors } from '../utils';

interface StampCanvasProps {
  config: StampConfig;
  onExtractColors: (colors: string[]) => void;
  // If an image is loaded, we pass it down
  uploadedImage: HTMLImageElement | null;
  useChromaKey: boolean;
  chromaColor: string;
  chromaTolerance: number;
}

export default function StampCanvas({
  config,
  onExtractColors,
  uploadedImage,
  useChromaKey,
  chromaColor,
  chromaTolerance
}: StampCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgrImageData, setBgrImageData] = useState<ImageData | null>(null);
  const [processedCutout, setProcessedCutout] = useState<HTMLCanvasElement | null>(null);

  // We detect whether the uploaded image is wide, tall, standard vertical, or standard horizontal
  let isWide = false;
  let isTall = false;
  let isStandardHorizontal = false;

  if (uploadedImage) {
    const ar = uploadedImage.width / uploadedImage.height;
    if (ar > 1.6) {
      isWide = true; // Two-joint stamp horizontal
    } else if (ar < 0.625) {
      isTall = true; // Two-joint stamp vertical
    } else if (ar >= 1.0) {
      isStandardHorizontal = true; // Standard horizontal landscape stamp
    }
  }

  // Determine logical design size
  let logicalW = 420;
  let logicalH = 540; // Default Standard Vertical Stamp

  if (isWide) {
    logicalW = 660;
    logicalH = 390;
  } else if (isTall) {
    logicalW = 390;
    logicalH = 660;
  } else if (isStandardHorizontal) {
    logicalW = 540;
    logicalH = 420;
  }

  // Apply fallback chroma key processing if enabled
  useEffect(() => {
    if (!uploadedImage) {
      setBgrImageData(null);
      setProcessedCutout(null);
      return;
    }

    // Capture standard imageData to do chroma-key color cutting
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = uploadedImage.width;
    tempCanvas.height = uploadedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(uploadedImage, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, uploadedImage.width, uploadedImage.height);
    setBgrImageData(imgData);
  }, [uploadedImage]);

  // Create processed cutout if chromakey is on
  useEffect(() => {
    if (!uploadedImage || !bgrImageData) {
      setProcessedCutout(null);
      return;
    }

    if (!useChromaKey) {
      setProcessedCutout(null);
      return;
    }

    // Perform chroma key filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = uploadedImage.width;
    tempCanvas.height = uploadedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Parse hex
    const hex = chromaColor.replace('#', '');
    const rKey = parseInt(hex.substring(0, 2), 16);
    const gKey = parseInt(hex.substring(2, 4), 16);
    const bKey = parseInt(hex.substring(4, 6), 16);

    const filteredData = tempCtx.createImageData(bgrImageData.width, bgrImageData.height);
    const src = bgrImageData.data;
    const dest = filteredData.data;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const a = src[i + 3];

      const dist = Math.sqrt(
        Math.pow(r - rKey, 2) +
        Math.pow(g - gKey, 2) +
        Math.pow(b - bKey, 2)
      );

      if (dist < chromaTolerance) {
        dest[i] = 0;
        dest[i + 1] = 0;
        dest[i + 2] = 0;
        dest[i + 3] = 0; // Fully transparent
      } else {
        dest[i] = r;
        dest[i + 1] = g;
        dest[i + 2] = b;
        dest[i + 3] = a;
      }
    }

    tempCtx.putImageData(filteredData, 0, 0);
    setProcessedCutout(tempCanvas);
  }, [useChromaKey, chromaColor, chromaTolerance, bgrImageData, uploadedImage]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI Scaling Factor (2x is crisp and lightweight, works amazing)
    const scaleFactor = 2;
    canvas.width = logicalW * scaleFactor;
    canvas.height = logicalH * scaleFactor;
    ctx.scale(scaleFactor, scaleFactor);

    // Dynamic perforation details
    const r = config.perforationRadius;
    const gap = config.perforationGap;
    const margin = 24; // transparent space allocation for drop shadow
    const sw = logicalW - 2 * margin; // Stamp Width inside canvas
    const sh = logicalH - 2 * margin; // Stamp Height inside canvas

    // Let's determine number of holes automatically to align nicely
    const countCornerMargin = r * 2.5; 
    const availableW = sw - 2 * countCornerMargin;
    const availableH = sh - 2 * countCornerMargin;
    const numHolesX = Math.max(3, Math.round(availableW / gap));
    const numHolesY = Math.max(3, Math.round(availableH / gap));

    // Clear Canvas with transparency
    ctx.clearRect(0, 0, logicalW, logicalH);

    // 1. Draw Stamp base shape with Drop Shadow API
    ctx.save();
    
    // Core function to draw perforated stamp path
    const buildStampPath = (cxCtx: CanvasRenderingContext2D, px: number, py: number, pW: number, pH: number) => {
      cxCtx.beginPath();
      const startX = px + countCornerMargin;
      const endX = px + pW - countCornerMargin;
      const startY = py + countCornerMargin;
      const endY = py + pH - countCornerMargin;

      // Top Edge
      cxCtx.moveTo(px, py);
      cxCtx.lineTo(startX, py);
      for (let i = 0; i < numHolesX; i++) {
        const xPos = startX + (i / (numHolesX - 1)) * (endX - startX);
        cxCtx.arc(xPos, py, r, Math.PI, 0, true);
      }
      cxCtx.lineTo(px + pW, py);

      // Right Edge
      cxCtx.lineTo(px + pW, startY);
      for (let i = 0; i < numHolesY; i++) {
        const yPos = startY + (i / (numHolesY - 1)) * (endY - startY);
        cxCtx.arc(px + pW, yPos, r, 1.5 * Math.PI, 0.5 * Math.PI, true);
      }
      cxCtx.lineTo(px + pW, py + pH);

      // Bottom Edge
      cxCtx.lineTo(endX, py + pH);
      for (let i = numHolesX - 1; i >= 0; i--) {
        const xPos = startX + (i / (numHolesX - 1)) * (endX - startX);
        cxCtx.arc(xPos, py + pH, r, 0, Math.PI, true);
      }
      cxCtx.lineTo(px, py + pH);

      // Left Edge
      cxCtx.lineTo(px, endY);
      for (let i = numHolesY - 1; i >= 0; i--) {
        const yPos = startY + (i / (numHolesY - 1)) * (endY - startY);
        cxCtx.arc(px, yPos, r, 0.5 * Math.PI, 1.5 * Math.PI, true);
      }
      cxCtx.lineTo(px, py);
      cxCtx.closePath();
    };

    buildStampPath(ctx, margin, margin, sw, sh);

    // Give the stamp a realistic drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Fill background of stamp
    ctx.fillStyle = config.backgroundColor;
    ctx.fill();

    // Turn off shadow properties so subsequent elements do not have duplicate shadows
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Save for clipping our illustration and background strictly inside the stamp edges
    ctx.save();
    ctx.clip();

    // 2. Render either placeholder artwork OR uploaded image
    const illustrationX = margin;
    const illustrationY = margin;
    const illustrationW = sw;
    const illustrationH = sh;

    const imgToDraw = useChromaKey && processedCutout ? processedCutout : uploadedImage;

    if (imgToDraw) {
      ctx.save();
      
      // Calculate center of stamp for drawing
      const centerX = margin + sw / 2 + config.imageXOffset;
      const centerY = margin + sh / 2 + config.imageYOffset;

      const imgAR = imgToDraw.width / imgToDraw.height;
      let drawW = sw;
      let drawH = sw / imgAR;

      if (drawH < sh) {
        drawH = sh;
        drawW = sh * imgAR;
      }

      // Apply scale
      drawW *= config.imageScale;
      drawH *= config.imageScale;

      ctx.translate(centerX, centerY);
      ctx.drawImage(imgToDraw, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Draw standard beautiful high-end gradient sunrise default artwork
      // This is a premium vector art placeholder designed using native canvas paths
      ctx.save();
      
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(margin, margin, margin, margin + sh);
      skyGrad.addColorStop(0, '#fdf2f8'); // subtle pinkish mist
      skyGrad.addColorStop(0.35, '#ffedd5'); // orange tint
      skyGrad.addColorStop(1, '#ffbeb2'); // sunrise warm reddish
      ctx.fillStyle = skyGrad;
      ctx.fillRect(illustrationX, illustrationY, illustrationW, illustrationH);

      // Distant mountains
      ctx.fillStyle = '#db2777'; // magenta tint
      ctx.beginPath();
      ctx.moveTo(margin - 10, margin + sh);
      ctx.lineTo(margin + sw * 0.35, margin + sh * 0.55);
      ctx.lineTo(margin + sw * 0.7, margin + sh);
      ctx.fill();

      // Golden solar sun
      ctx.beginPath();
      ctx.arc(margin + sw * 0.62, margin + sh * 0.45, Math.min(sw, sh) * 0.22, 0, Math.PI * 2);
      const sunGrad = ctx.createRadialGradient(
        margin + sw * 0.62, margin + sh * 0.45, 5,
        margin + sw * 0.62, margin + sh * 0.45, Math.min(sw, sh) * 0.22
      );
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // Front Mountain
      ctx.fillStyle = '#4c0519'; // dark crimson-black
      ctx.beginPath();
      ctx.moveTo(margin + sw * 0.15, margin + sh);
      ctx.lineTo(margin + sw * 0.75, margin + sh * 0.48);
      ctx.lineTo(margin + sw + 10, margin + sh);
      ctx.fill();

      // Elegant bamboo shoot branches along bottom-left margin
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.8;
      
      const drawBamboo = (bx: number, by: number, len: number, angleGrad: number) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angleGrad * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(5, -len * 0.4, 2, -len);
        ctx.stroke();
        
        // Leaves
        ctx.translate(2, -len * 0.6);
        ctx.fillStyle = '#1c1917';
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.ellipse(5 + j*2, -j*4, 12, 3, (120 + j*15) * Math.PI / 180, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      drawBamboo(margin + sw * 0.1, margin + sh, 140, 18);
      drawBamboo(margin + sw * 0.2, margin + sh, 110, 8);

      // Minimalist birds flying
      const drawBird = (bx: number, by: number, size: number) => {
        ctx.beginPath();
        ctx.moveTo(bx - size, by);
        ctx.bezierCurveTo(bx - size * 0.5, by - size * 0.5, bx, by - size * 0.2, bx, by);
        ctx.bezierCurveTo(bx, by - size * 0.2, bx + size * 0.5, by - size * 0.5, bx + size, by);
        ctx.strokeStyle = '#3e1b1b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      drawBird(margin + sw * 0.45, margin + sh * 0.25, 7);
      drawBird(margin + sw * 0.52, margin + sh * 0.20, 5);

      ctx.restore();
    }

    // 3. Draw The Classic Inner Fine Frame Lines
    const padding = config.innerBorderPadding;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0;
    // Inner rect
    ctx.strokeRect(margin + padding, margin + padding, sw - 2 * padding, sh - 2 * padding);

    // Optional subtle outline right inside the border path to mimic realistic copper engraving frame lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin + padding + 2.5, margin + padding + 2.5, sw - 2 * padding - 5, sh - 2 * padding - 5);

    // 4. TEXT LAYOUT & ALIGNMENT STYLES
    // Prepare values
    const countryText = config.country;
    const valText = config.faceValue;
    const titleText = config.title;
    const subText = config.subtitle;
    const codeText = config.code;
    const yearText = config.year;

    // Helper functions to draw crisp text
    const setupSerifFont = (size: number, weight: string = 'bold') => {
      ctx.font = `${weight} ${size}px "Source Han Serif CN", "NianHua Serif", "Playfair Display", Georgia, serif`;
    };
    const setupSansFont = (size: number, weight: string = 'normal') => {
      ctx.font = `${weight} ${size}px "Inter", "Source Han Sans CN", sans-serif`;
    };
    const setupMonoFont = (size: number, weight: string = 'normal') => {
      ctx.font = `${weight} ${size}px "JetBrains Mono", "Courier New", monospace`;
    };

    // Color choices
    const textLight = '#ffffff';
    const textMuted = 'rgba(255,255,255,0.8)';
    const textExtraMuted = 'rgba(255,255,255,0.55)';

    // STYLE 1: Country vertical Left (古典左竖排)
    if (config.style === 'style1') {
      // A. Country Text (Vertical Left)
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const valX = margin + padding + 18;
      const valYStart = margin + padding + 30;

      if (config.lang === 'zh') {
        // Vertical Chinese Characters
        setupSerifFont(16, 'bold');
        const chars = countryText.split('');
        const charSpacing = 24;
        chars.forEach((char, idx) => {
          ctx.fillText(char, valX, valYStart + idx * charSpacing);
        });
      } else {
        // Rotate text nicely for English
        ctx.translate(valX, margin + padding + 60);
        ctx.rotate(-Math.PI / 2);
        setupSansFont(12, 'bold');
        ctx.fillText(countryText, 0, 0);
      }
      ctx.restore();

      // B. Face value (Large bold bottom-right)
      ctx.save();
      setupSerifFont(26, 'bold');
      ctx.fillStyle = '#fef08a'; // beautiful stamp gold yellow
      ctx.textAlign = 'right';
      ctx.fillText(valText, margin + sw - padding - 14, margin + sh - padding - 22);
      ctx.restore();

      // C. Title & Subtitle (Poetry) in elegant bottom/center stack
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'left';

      // Title
      setupSerifFont(22, 'bold');
      const titleY = margin + sh - padding - 54;
      ctx.fillText(titleText, margin + padding + 15, titleY);

      // Subtitle
      setupSansFont(10.5, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, margin + padding + 15, titleY + 22);
      ctx.restore();

      // D. Code & Year written vertically or along absolute edge
      ctx.save();
      setupMonoFont(7.5, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'center';
      ctx.fillText(`${codeText}   [${yearText}]`, margin + sw / 2, margin + sh - padding + 8);
      ctx.restore();
    }

    // STYLE 2: Country horizontal Top (现代经典顶部横排)
    else if (config.style === 'style2') {
      // A. Country Text (Horizontal top left)
      ctx.save();
      setupSerifFont(16, 'bold');
      ctx.fillStyle = textLight;
      ctx.textAlign = 'left';
      ctx.fillText(countryText, margin + padding + 15, margin + padding + 24);
      ctx.restore();

      // B. Face Value (Horizontal top right)
      ctx.save();
      setupSerifFont(22, 'bold');
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'right';
      ctx.fillText(valText, margin + sw - padding - 15, margin + padding + 24);
      ctx.restore();

      // C. Title in center, Subtitle (Poetry) stacked
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'center';

      // Title
      setupSerifFont(24, 'bold');
      const titleY = margin + sh - padding - 64;
      ctx.fillText(titleText, margin + sw / 2, titleY);

      // Subtitle
      setupSansFont(10.5, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, margin + sw / 2, titleY + 24);
      ctx.restore();

      // D. Stamp Code
      ctx.save();
      setupMonoFont(7.5, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'center';
      // Put stamp coding on the right/left bottom
      ctx.fillText(codeText, margin + padding + 30, margin + sh - padding + 8);
      ctx.fillText(yearText, margin + sw - padding - 20, margin + sh - padding + 8);
      ctx.restore();
    }

    // STYLE 3: Minimalist Bottom Banner (极简至上)
    else if (config.style === 'style3') {
      // A. Face value (Top left)
      ctx.save();
      setupSerifFont(18, 'bold');
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(valText, margin + padding + 15, margin + padding + 24);
      ctx.restore();

      // B. Title & Subtitle written vertically/center on the top half
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'center';

      // Title (centered top half)
      setupSerifFont(26, 'bold');
      ctx.fillText(titleText, margin + sw / 2, margin + padding + 60);

      // Subtitle
      setupSansFont(11, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, margin + sw / 2, margin + padding + 90);
      ctx.restore();

      // C. Country name placed in a beautiful horizontal banner at the bottom aligned right
      ctx.save();
      setupSerifFont(16, 'bold');
      ctx.fillStyle = textLight;
      ctx.textAlign = 'right';
      ctx.fillText(countryText, margin + sw - padding - 15, margin + sh - padding - 20);
      ctx.restore();

      // D. Stamp Code and Year bottom aligned left
      ctx.save();
      setupMonoFont(8, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'left';
      ctx.fillText(`C.N. ${codeText} / ${yearText}`, margin + padding + 15, margin + sh - padding - 20);
      ctx.restore();
    }

    ctx.restore(); // Restores from clipping paths (restores normal canvas)

    // 5. TWO-JOINT STAMP MIDLINE HOLES (Only if isWide or isTall, drawn outside the clipped zone)
    if (isWide || isTall) {
      ctx.save();
      // Physical holes: destination-out gives true transparent physical dots!
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000'; // alpha mask source doesn't matter, just needs color
      
      const holeRad = r * 0.70; // midline holes are slightly smaller
      const midlinePitch = gap * 0.95; // tighter spacing matches standard se-tenant tickets

      if (isWide) {
        const midX = margin + sw / 2;
        const totalMidH = sh;
        const numPerfMid = Math.round(totalMidH / midlinePitch);
        const startY = margin;
        
        for (let i = 1; i < numPerfMid; i++) {
          const py = startY + (i / numPerfMid) * totalMidH;
          ctx.beginPath();
          ctx.arc(midX, py, holeRad, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const midY = margin + sh / 2;
        const totalMidW = sw;
        const numPerfMid = Math.round(totalMidW / midlinePitch);
        const startX = margin;

        for (let i = 1; i < numPerfMid; i++) {
          const px = startX + (i / numPerfMid) * totalMidW;
          ctx.beginPath();
          ctx.arc(px, midY, holeRad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    ctx.restore(); // Complete Canvas state fully restored

  }, [config, logicalW, logicalH, isWide, isTall, isStandardHorizontal, uploadedImage, processedCutout, useChromaKey, chromaColor, chromaTolerance]);

  // Export to high-res PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Retrieve file
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `AI_Stamp_${config.title || 'Stamp'}_${new Date().toISOString().substring(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4 md:p-8 flex-1">
      {/* Real-time Studio Visual Workspace Container */}
      <div 
        ref={containerRef} 
        id="stamp-workspace-grid" 
        className="relative flex items-center justify-center p-6 md:p-12 border border-zinc-800 rounded-3xl bg-zinc-900 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] shadow-inner w-full min-h-[460px]"
      >
        {/* Transparency Alert Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/60 rounded-full text-[10px] text-zinc-400 backdrop-blur-sm select-none z-10 font-mono">
          <Grid2X2 className="w-3 h-3 text-amber-500" />
          <span>边缘已裁剪透明 / Transparency Canvas Activated</span>
        </div>

        {/* Dynamic Interactive Canvas */}
        <div className="relative group transition-all duration-300 transform scrollbar-none flex justify-center">
          <canvas
            ref={canvasRef}
            id="stamp-canvas-main"
            className="rounded-lg shadow-2xl transition-all duration-200"
            style={{ 
              width: '100%', 
              maxWidth: `${logicalW}px`,
              aspectRatio: `${logicalW} / ${logicalH}`
            }}
          />
        </div>
      </div>

      {/* Primary Export controls */}
      <div className="flex items-center gap-3.5 w-full max-w-sm justify-center">
        <button
          onClick={handleDownloadPNG}
          id="btn-download-stamp"
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg cursor-pointer"
        >
          <Download className="w-5 h-5 stroke-[2.5px]" />
          下载高清 PNG 邮票 / Save Stamp
        </button>
      </div>
    </div>
  );
}
