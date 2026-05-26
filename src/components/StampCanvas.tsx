import React, { useRef, useEffect, useState } from 'react';
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
  onConfigChange?: (updates: Partial<StampConfig>) => void;
}

export default function StampCanvas({
  config,
  onExtractColors,
  uploadedImage,
  useChromaKey,
  chromaColor,
  chromaTolerance,
  onConfigChange
}: StampCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgrImageData, setBgrImageData] = useState<ImageData | null>(null);
  const [processedCutout, setProcessedCutout] = useState<HTMLCanvasElement | null>(null);

  // States for the direct visual drag-repositioning & scaling
  const [designMode, setDesignMode] = useState(true);
  const [activeElement, setActiveElement] = useState<'image' | 'title' | 'faceValue' | 'country' | 'code' | null>('image');
  const [dragState, setDragState] = useState<{
    element: 'image' | 'title' | 'faceValue' | 'country' | 'code';
    startX: number;
    startY: number;
    startOffsetLimitX: number;
    startOffsetLimitY: number;
    type: 'move' | 'resize';
    startScale: number;
  } | null>(null);

  // Determine logical design size
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

  // Calculate coordinates of each visual block in design pixels
  const getElementRects = () => {
    const margin = 24;
    const sw = logicalW - 2 * margin;
    const sh = logicalH - 2 * margin;
    const padding = config.innerBorderPadding;

    // Default configuration metrics safely set
    const image_x = config.imageXOffset || 0;
    const image_y = config.imageYOffset || 0;
    const image_sc = config.imageScale || 1.0;

    const t_x = config.titleXOffset || 0;
    const t_y = config.titleYOffset || 0;
    const t_sc = config.titleScale || 1.0;

    const fv_x = config.faceValueXOffset || 0;
    const fv_y = config.faceValueYOffset || 0;
    const fv_sc = config.faceValueScale || 1.0;

    const c_x = config.countryXOffset || 0;
    const c_y = config.countryYOffset || 0;
    const c_sc = config.countryScale || 1.0;

    const cd_x = config.codeXOffset || 0;
    const cd_y = config.codeYOffset || 0;
    const cd_sc = config.codeScale || 1.0;

    const rects: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {};

    // 1. Image block
    const imgW = sw * 0.72 * image_sc;
    const imgH = sh * 0.72 * image_sc;
    rects.image = {
      x: (margin + sw / 2 + image_x) - imgW / 2,
      y: (margin + sh / 2 + image_y) - imgH / 2,
      w: imgW,
      h: imgH,
      label: '图样 / Image Focus'
    };

    // 2. Title and subtitle combined block
    if (config.style === 'style1') {
      const w = sw * 0.52 * t_sc;
      const h = 50 * t_sc;
      rects.title = {
        x: (margin + padding + 15 + t_x),
        y: (margin + sh - padding - 64 + t_y),
        w,
        h,
        label: '题识诗文 / Title & Poem'
      };
    } else if (config.style === 'style2') {
      const w = sw * 0.65 * t_sc;
      const h = 50 * t_sc;
      rects.title = {
        x: (margin + sw / 2 + t_x) - w / 2,
        y: (margin + sh - padding - 74 + t_y),
        w,
        h,
        label: '题识诗文 / Title & Poem'
      };
    } else {
      const w = sw * 0.65 * t_sc;
      const h = 55 * t_sc;
      rects.title = {
        x: (margin + sw / 2 + t_x) - w / 2,
        y: (margin + padding + 55 + t_y),
        w,
        h,
        label: '题识诗文 / Title & Poem'
      };
    }

    // 3. Face Value (Denomination) block
    if (config.style === 'style1') {
      const w = 110 * fv_sc;
      const h = 34 * fv_sc;
      rects.faceValue = {
        x: (margin + sw - padding - 14 + fv_x) - w,
        y: (margin + sh - padding - 44 + fv_y),
        w,
        h,
        label: '画幅面值 / Value'
      };
    } else if (config.style === 'style2') {
      const w = 100 * fv_sc;
      const h = 30 * fv_sc;
      rects.faceValue = {
        x: (margin + sw - padding - 15 + fv_x) - w,
        y: (margin + padding + 10 + fv_y),
        w,
        h,
        label: '画幅面值 / Value'
      };
    } else {
      const w = 100 * fv_sc;
      const h = 30 * fv_sc;
      rects.faceValue = {
        x: (margin + padding + 15 + fv_x),
        y: (margin + padding + 10 + fv_y),
        w,
        h,
        label: '画幅面值 / Value'
      };
    }

    // 4. Country Label block
    if (config.style === 'style1') {
      const w = 38 * c_sc;
      const h = 135 * c_sc;
      rects.country = {
        x: (margin + padding + 18 + c_x) - w / 2,
        y: (margin + padding + 20 + c_y),
        w,
        h,
        label: '国家名称 / Country'
      };
    } else if (config.style === 'style2') {
      const w = 110 * c_sc;
      const h = 30 * c_sc;
      rects.country = {
        x: (margin + padding + 15 + c_x),
        y: (margin + padding + 10 + c_y),
        w,
        h,
        label: '国家名称 / Country'
      };
    } else {
      const w = 110 * c_sc;
      const h = 30 * c_sc;
      rects.country = {
        x: (margin + sw - padding - 15 + c_x) - w,
        y: (margin + sh - padding - 34 + c_y),
        w,
        h,
        label: '国家名称 / Country'
      };
    }

    // 5. Code and Year block
    if (config.style === 'style1') {
      const w = sw * 0.70 * cd_sc;
      const h = 24 * cd_sc;
      rects.code = {
        x: (margin + sw / 2 + cd_x) - w / 2,
        y: (margin + sh - padding + cd_y),
        w,
        h,
        label: '邮资编码 / Catalog Code'
      };
    } else if (config.style === 'style2') {
      const w = sw * 0.90 * cd_sc;
      const h = 24 * cd_sc;
      rects.code = {
        x: (margin + sw / 2 + cd_x) - w / 2,
        y: (margin + sh - padding + cd_y),
        w,
        h,
        label: '邮资编码 / Catalog Code'
      };
    } else {
      const w = 160 * cd_sc;
      const h = 24 * cd_sc;
      rects.code = {
        x: (margin + padding + 15 + cd_x),
        y: (margin + sh - padding - cd_y - 30),
        w,
        h,
        label: '邮资编码 / Catalog Code'
      };
    }

    return rects;
  };

  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent, 
    element: 'image' | 'title' | 'faceValue' | 'country' | 'code',
    type: 'move' | 'resize'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let startXOffset = 0;
    let startYOffset = 0;
    let startScaleMultiplier = 1.0;

    switch (element) {
      case 'image':
        startXOffset = config.imageXOffset || 0;
        startYOffset = config.imageYOffset || 0;
        startScaleMultiplier = config.imageScale || 1.0;
        break;
      case 'title':
        startXOffset = config.titleXOffset || 0;
        startYOffset = config.titleYOffset || 0;
        startScaleMultiplier = config.titleScale || 1.0;
        break;
      case 'faceValue':
        startXOffset = config.faceValueXOffset || 0;
        startYOffset = config.faceValueYOffset || 0;
        startScaleMultiplier = config.faceValueScale || 1.0;
        break;
      case 'country':
        startXOffset = config.countryXOffset || 0;
        startYOffset = config.countryYOffset || 0;
        startScaleMultiplier = config.countryScale || 1.0;
        break;
      case 'code':
        startXOffset = config.codeXOffset || 0;
        startYOffset = config.codeYOffset || 0;
        startScaleMultiplier = config.codeScale || 1.0;
        break;
    }

    setDragState({
      element,
      startX: clientX,
      startY: clientY,
      startOffsetLimitX: startXOffset,
      startOffsetLimitY: startYOffset,
      type,
      startScale: startScaleMultiplier
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      const container = containerRef.current;
      if (!container) return;
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      
      const designToPixelRatio = logicalW / canvasEl.clientWidth;
      const deltaDesignX = deltaX * designToPixelRatio;
      const deltaDesignY = deltaY * designToPixelRatio;

      if (dragState.type === 'move') {
        const updates: Partial<StampConfig> = {};
        const newX = Math.round(dragState.startOffsetLimitX + deltaDesignX);
        const newY = Math.round(dragState.startOffsetLimitY + deltaDesignY);

        switch (dragState.element) {
          case 'image':
            updates.imageXOffset = newX;
            updates.imageYOffset = newY;
            break;
          case 'title':
            updates.titleXOffset = newX;
            updates.titleYOffset = newY;
            break;
          case 'faceValue':
            updates.faceValueXOffset = newX;
            updates.faceValueYOffset = newY;
            break;
          case 'country':
            updates.countryXOffset = newX;
            updates.countryYOffset = newY;
            break;
          case 'code':
            updates.codeXOffset = newX;
            updates.codeYOffset = newY;
            break;
        }
        if (onConfigChange) {
          onConfigChange(updates);
        }
      } else {
        const horizontalFactor = deltaDesignX / 200;
        const verticalFactor = deltaDesignY / 200;
        const overallDelta = Math.abs(deltaDesignX) > Math.abs(deltaDesignY) ? horizontalFactor : verticalFactor;
        
        const newScale = parseFloat(Math.max(0.1, Math.min(5.0, dragState.startScale + overallDelta)).toFixed(2));
        
        const updates: Partial<StampConfig> = {};
        switch (dragState.element) {
          case 'image':
            updates.imageScale = newScale;
            break;
          case 'title':
            updates.titleScale = newScale;
            break;
          case 'faceValue':
            updates.faceValueScale = newScale;
            break;
          case 'country':
            updates.countryScale = newScale;
            break;
          case 'code':
            updates.codeScale = newScale;
            break;
        }
        if (onConfigChange) {
          onConfigChange(updates);
        }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragState.startX;
      const deltaY = touch.clientY - dragState.startY;

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const designToPixelRatio = logicalW / canvasEl.clientWidth;
      const deltaDesignX = deltaX * designToPixelRatio;
      const deltaDesignY = deltaY * designToPixelRatio;

      if (dragState.type === 'move') {
        const updates: Partial<StampConfig> = {};
        const newX = Math.round(dragState.startOffsetLimitX + deltaDesignX);
        const newY = Math.round(dragState.startOffsetLimitY + deltaDesignY);

        switch (dragState.element) {
          case 'image':
            updates.imageXOffset = newX;
            updates.imageYOffset = newY;
            break;
          case 'title':
            updates.titleXOffset = newX;
            updates.titleYOffset = newY;
            break;
          case 'faceValue':
            updates.faceValueXOffset = newX;
            updates.faceValueYOffset = newY;
            break;
          case 'country':
            updates.countryXOffset = newX;
            updates.countryYOffset = newY;
            break;
          case 'code':
            updates.codeXOffset = newX;
            updates.codeYOffset = newY;
            break;
        }
        if (onConfigChange) {
          onConfigChange(updates);
        }
      } else {
        const horizontalFactor = deltaDesignX / 200;
        const verticalFactor = deltaDesignY / 200;
        const overallDelta = Math.abs(deltaDesignX) > Math.abs(deltaDesignY) ? horizontalFactor : verticalFactor;
        
        const newScale = parseFloat(Math.max(0.1, Math.min(5.0, dragState.startScale + overallDelta)).toFixed(2));
        
        const updates: Partial<StampConfig> = {};
        switch (dragState.element) {
          case 'image':
            updates.imageScale = newScale;
            break;
          case 'title':
            updates.titleScale = newScale;
            break;
          case 'faceValue':
            updates.faceValueScale = newScale;
            break;
          case 'country':
            updates.countryScale = newScale;
            break;
          case 'code':
            updates.codeScale = newScale;
            break;
        }
        if (onConfigChange) {
          onConfigChange(updates);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState, logicalW, onConfigChange, config]);

  const handleResetLayout = () => {
    if (onConfigChange) {
      onConfigChange({
        imageScale: 1.05,
        imageXOffset: 0,
        imageYOffset: 0,
        titleXOffset: 0,
        titleYOffset: 0,
        titleScale: 1.0,
        faceValueXOffset: 0,
        faceValueYOffset: 0,
        faceValueScale: 1.0,
        countryXOffset: 0,
        countryYOffset: 0,
        countryScale: 1.0,
        codeXOffset: 0,
        codeYOffset: 0,
        codeScale: 1.0
      });
    }
  };

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
      
      const cScale = config.countryScale || 1.0;
      const valX = margin + padding + 18 + (config.countryXOffset || 0);
      const valYStart = margin + padding + 30 + (config.countryYOffset || 0);

      if (config.lang === 'zh') {
        // Vertical Chinese Characters
        setupSerifFont(16 * cScale, 'bold');
        const chars = countryText.split('');
        const charSpacing = 24 * cScale;
        chars.forEach((char, idx) => {
          ctx.fillText(char, valX, valYStart + idx * charSpacing);
        });
      } else {
        // Rotate text nicely for English
        ctx.translate(valX, margin + padding + 60 + (config.countryYOffset || 0));
        ctx.rotate(-Math.PI / 2);
        setupSansFont(12 * cScale, 'bold');
        ctx.fillText(countryText, 0, 0);
      }
      ctx.restore();

      // B. Face value (Large bold bottom-right)
      ctx.save();
      const fvScale = config.faceValueScale || 1.0;
      setupSerifFont(26 * fvScale, 'bold');
      ctx.fillStyle = '#fef08a'; // beautiful stamp gold yellow
      ctx.textAlign = 'right';
      ctx.fillText(valText, margin + sw - padding - 14 + (config.faceValueXOffset || 0), margin + sh - padding - 22 + (config.faceValueYOffset || 0));
      ctx.restore();

      // C. Title & Subtitle (Poetry) in elegant bottom/center stack
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'left';

      // Title
      const tScale = config.titleScale || 1.0;
      setupSerifFont(22 * tScale, 'bold');
      const titleX = margin + padding + 15 + (config.titleXOffset || 0);
      const titleY = margin + sh - padding - 54 + (config.titleYOffset || 0);
      ctx.fillText(titleText, titleX, titleY);

      // Subtitle
      setupSansFont(10.5 * tScale, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, titleX, titleY + 22 * tScale);
      ctx.restore();

      // D. Code & Year written vertically or along absolute edge
      ctx.save();
      const cdScale = config.codeScale || 1.0;
      setupMonoFont(7.5 * cdScale, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'center';
      ctx.fillText(`${codeText}   [${yearText}]`, margin + sw / 2 + (config.codeXOffset || 0), margin + sh - padding + 8 + (config.codeYOffset || 0));
      ctx.restore();
    }

    // STYLE 2: Country horizontal Top (现代经典顶部横排)
    else if (config.style === 'style2') {
      // A. Country Text (Horizontal top left)
      ctx.save();
      const cScale = config.countryScale || 1.0;
      setupSerifFont(16 * cScale, 'bold');
      ctx.fillStyle = textLight;
      ctx.textAlign = 'left';
      ctx.fillText(countryText, margin + padding + 15 + (config.countryXOffset || 0), margin + padding + 24 + (config.countryYOffset || 0));
      ctx.restore();

      // B. Face Value (Horizontal top right)
      ctx.save();
      const fvScale = config.faceValueScale || 1.0;
      setupSerifFont(22 * fvScale, 'bold');
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'right';
      ctx.fillText(valText, margin + sw - padding - 15 + (config.faceValueXOffset || 0), margin + padding + 24 + (config.faceValueYOffset || 0));
      ctx.restore();

      // C. Title in center, Subtitle (Poetry) stacked
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'center';

      // Title
      const tScale = config.titleScale || 1.0;
      setupSerifFont(24 * tScale, 'bold');
      const titleX = margin + sw / 2 + (config.titleXOffset || 0);
      const titleY = margin + sh - padding - 64 + (config.titleYOffset || 0);
      ctx.fillText(titleText, titleX, titleY);

      // Subtitle
      setupSansFont(10.5 * tScale, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, titleX, titleY + 24 * tScale);
      ctx.restore();

      // D. Stamp Code
      ctx.save();
      const cdScale = config.codeScale || 1.0;
      setupMonoFont(7.5 * cdScale, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'center';
      const codeY = margin + sh - padding + 8 + (config.codeYOffset || 0);
      ctx.fillText(codeText, margin + padding + 30 + (config.codeXOffset || 0), codeY);
      ctx.fillText(yearText, margin + sw - padding - 20 + (config.codeXOffset || 0), codeY);
      ctx.restore();
    }

    // STYLE 3: Minimalist Bottom Banner (极简至上)
    else if (config.style === 'style3') {
      // A. Face value (Top left)
      ctx.save();
      const fvScale = config.faceValueScale || 1.0;
      setupSerifFont(18 * fvScale, 'bold');
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(valText, margin + padding + 15 + (config.faceValueXOffset || 0), margin + padding + 24 + (config.faceValueYOffset || 0));
      ctx.restore();

      // B. Title & Subtitle written vertically/center on the top half
      ctx.save();
      ctx.fillStyle = textLight;
      ctx.textAlign = 'center';

      // Title (centered top half)
      const tScale = config.titleScale || 1.0;
      const titleX = margin + sw / 2 + (config.titleXOffset || 0);
      const titleY = margin + padding + 60 + (config.titleYOffset || 0);
      setupSerifFont(26 * tScale, 'bold');
      ctx.fillText(titleText, titleX, titleY);

      // Subtitle
      setupSansFont(11 * tScale, 'normal');
      ctx.fillStyle = textMuted;
      ctx.fillText(subText, titleX, titleY + 30 * tScale);
      ctx.restore();

      // C. Country name placed in a beautiful horizontal banner at the bottom aligned right
      ctx.save();
      const cScale = config.countryScale || 1.0;
      setupSerifFont(16 * cScale, 'bold');
      ctx.fillStyle = textLight;
      ctx.textAlign = 'right';
      ctx.fillText(countryText, margin + sw - padding - 15 + (config.countryXOffset || 0), margin + sh - padding - 20 + (config.countryYOffset || 0));
      ctx.restore();

      // D. Stamp Code and Year bottom aligned left
      ctx.save();
      const cdScale = config.codeScale || 1.0;
      setupMonoFont(8 * cdScale, 'normal');
      ctx.fillStyle = textExtraMuted;
      ctx.textAlign = 'left';
      ctx.fillText(`C.N. ${codeText} / ${yearText}`, margin + padding + 15 + (config.codeXOffset || 0), margin + sh - padding - 20 + (config.codeYOffset || 0));
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
        className="relative flex flex-col items-center justify-center p-6 md:p-12 border border-zinc-800 rounded-3xl bg-zinc-900 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] shadow-inner w-full min-h-[460px]"
      >
        {/* Transparency Alert Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/60 rounded-full text-[10px] text-zinc-400 backdrop-blur-sm select-none z-10 font-mono">
          <Grid2X2 className="w-3 h-3 text-amber-500" />
          <span>边缘已裁剪透明 / Transparency Canvas Activated</span>
        </div>

        {/* Interactive Layout Designer Mode Toolbar */}
        <div className="absolute top-3 right-3 flex items-center gap-2 select-none z-10">
          <button
            onClick={() => setDesignMode(!designMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[10.5px] font-semibold transition-all backdrop-blur-sm cursor-pointer ${
              designMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Square className={`w-3 h-3 ${designMode ? 'fill-amber-400 font-bold text-amber-400' : ''}`} />
            <span>{designMode ? '画布内拖动编辑 [开]' : '画布内拖动编辑 [关]'}</span>
          </button>
          
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950/80 border border-zinc-850 hover:border-zinc-700 rounded-full text-[10.5px] font-medium text-zinc-400 hover:text-zinc-200 transition-all backdrop-blur-sm cursor-pointer"
            title="恢复排版"
          >
            <RefreshCw className="w-3 h-3" />
            <span>恢复默认</span>
          </button>
        </div>

        {/* Dynamic Interactive Canvas */}
        <div className="relative group transition-all duration-300 transform scrollbar-none flex justify-center w-full max-w-[420px] sm:max-w-none" style={{ maxWidth: `${logicalW}px` }}>
          <canvas
            ref={canvasRef}
            id="stamp-canvas-main"
            className={`rounded-lg shadow-2xl transition-all duration-200 ${
              designMode ? 'ring-2 ring-amber-500/40' : ''
            }`}
            style={{ 
              width: '100%', 
              maxWidth: `${logicalW}px`,
              aspectRatio: `${logicalW} / ${logicalH}`
            }}
          />

          {/* Active Overlays for Selection Boxes */}
          {designMode && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
              {Object.entries(getElementRects()).map(([key, rect]) => {
                const isSelected = activeElement === key;
                const elKey = key as 'image' | 'title' | 'faceValue' | 'country' | 'code';
                
                return (
                  <div
                    key={key}
                    className={`absolute pointer-events-auto cursor-move select-none ${
                      isSelected 
                        ? 'border border-dashed border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.45)] z-30' 
                        : 'border border-transparent hover:border-dashed hover:border-zinc-400/40 hover:bg-white/5 z-10'
                    }`}
                    style={{
                      left: `${(rect.x / logicalW) * 100}%`,
                      top: `${(rect.y / logicalH) * 100}%`,
                      width: `${(rect.w / logicalW) * 100}%`,
                      height: `${(rect.h / logicalH) * 100}%`,
                    }}
                    onMouseDown={(e) => {
                      setActiveElement(elKey);
                      handleStartDrag(e, elKey, 'move');
                    }}
                    onTouchStart={(e) => {
                      setActiveElement(elKey);
                      handleStartDrag(e, elKey, 'move');
                    }}
                  >
                    {/* Tag label */}
                    <div className={`absolute top-0 left-0 text-[10px] px-1.5 py-0.5 rounded-br m-0 leading-none select-none ${
                      isSelected ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-neutral-900/95 text-zinc-400 text-[9px]'
                    }`}>
                      {rect.label}
                    </div>

                    {/* Scale Handles */}
                    {isSelected && (
                      <>
                        <div className="absolute top-0 left-0 w-2 h-2 bg-amber-400 border border-neutral-950 -translate-x-1/2 -translate-y-1/2 rounded-full" />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-400 border border-neutral-950 translate-x-1/2 -translate-y-1/2 rounded-full" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-amber-400 border border-neutral-950 -translate-x-1/2 translate-y-1/2 rounded-full" />
                        
                        {/* Bottom Right Resize Handle */}
                        <div 
                          className="absolute bottom-0 right-0 w-5 h-5 bg-amber-400 border border-neutral-950 translate-x-1/2 translate-y-1/2 rounded-full cursor-se-resize flex items-center justify-center pointer-events-auto shadow-md"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleStartDrag(e, elKey, 'resize');
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleStartDrag(e, elKey, 'resize');
                          }}
                          title="拖拽改变大小"
                        >
                          <ZoomIn className="w-2.5 h-2.5 text-neutral-900" style={{ strokeWidth: 3 }} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
