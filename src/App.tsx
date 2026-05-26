import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Languages, RefreshCw, Upload, Check, Info, HelpCircle, Heart, Star } from 'lucide-react';
import { StampConfig, Language, StampStyle, POETRY_PRESETS } from './types';
import { extractColors, translateAndFormatLabel, PredictionLabel } from './utils';
import { removeBackground } from '@imgly/background-removal';
import { classifyStampImage } from './lib/classifier';
import ControlPanel from './components/ControlPanel';
import StampCanvas from './components/StampCanvas';

export default function App() {
  // Main Stamp Configuration State
  const [config, setConfig] = useState<StampConfig>({
    title: '浮光',
    subtitle: '浮光跃金静影沉璧',
    faceValue: '¥ 1.20',
    country: '中国邮政',
    code: '2026-10 (4-1) T',
    year: '2026',
    lang: 'zh',
    style: 'style1',
    backgroundColor: '#db2777', // Classic elegant starting red
    perforationRadius: 6,
    perforationGap: 22,
    innerBorderWidth: 1.2,
    innerBorderPadding: 16,
    imageScale: 1.05,
    imageXOffset: 0,
    imageYOffset: 0
  });

  // Uploaded and processed Image States
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>(['#f43f5e', '#b91c1c', '#4c0519']);
  
  // AI Background Removal operation States
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgrProgressPct, setBgrProgressPct] = useState(0);
  const [bgrTaskMsg, setBgrTaskMsg] = useState('');

  // AI Image Classification States
  const [predictions, setPredictions] = useState<PredictionLabel[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState(0);
  const [classificationMsg, setClassificationMsg] = useState('');

  // Manual Chroma key details state
  const [useChromaKey, setUseChromaKey] = useState(false);
  const [chromaColor, setChromaColor] = useState('#ffffff');
  const [chromaTolerance, setChromaTolerance] = useState(35);


  const handleConfigChange = (updates: Partial<StampConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Automated poetry randomized combination trigger
  const handleRandomizeText = () => {
    const list = POETRY_PRESETS[config.lang];
    const MathRandomIndex = (arr: any[]) => Math.floor(Math.random() * arr.length);
    
    const randomTitle = list.words[MathRandomIndex(list.words)];
    const randomSubtitle = list.phrases[MathRandomIndex(list.phrases)];
    
    // Choose realistic code number based on language
    const randomSerial = config.lang === 'zh'
      ? `2026-${Math.floor(Math.random() * 20) + 1} (${Math.floor(Math.random() * 4) + 1}-1) T`
      : `SE-STAMP-${Math.floor(Math.random() * 800) + 100}`;

    handleConfigChange({
      title: randomTitle,
      subtitle: randomSubtitle,
      code: randomSerial
    });
  };

  // Run AI Browser-side image classification & apply translation and poem automatically
  const runClassification = async (imageUrl: string) => {
    setIsClassifying(true);
    setClassificationProgress(5);
    setClassificationMsg('正在加载浏览器本地轻量级识别模型...');
    try {
      const results = await classifyStampImage(imageUrl, (pct, msg) => {
        setClassificationProgress(pct);
        setClassificationMsg(msg);
      });
      const formatted = results.map(res => translateAndFormatLabel(res.label));
      setPredictions(formatted);

      if (formatted.length > 0) {
        const top = formatted[0];
        handleConfigChange({
          title: top.zh,
          subtitle: top.poemZh
        });
      }
      setIsClassifying(false);
    } catch (e) {
      console.error('Local classification failed:', e);
      setIsClassifying(false);
      setClassificationMsg('本地识别出错，您仍可手动生成文案');
    }
  };

  // Trigger color extraction & automatically apply secondary matching tone as canvas background
  const onImageElementLoad = (img: HTMLImageElement) => {
    const colors = extractColors(img, 3);
    setExtractedColors(colors);
    // Set matching background color automatically
    if (colors && colors.length > 0) {
      // Pick second color as background color for nice contrast, or default to first
      handleConfigChange({ backgroundColor: colors[1] || colors[0] });
    }
  };

  // Upload file pipeline
  const handleUploadImage = (file: File, runBgRemoval: boolean) => {
    const fileUrl = URL.createObjectURL(file);
    
    if (!runBgRemoval) {
      // Direct load
      const img = new Image();
      img.src = fileUrl;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setUploadedImage(img);
        setOriginalImage(img);
        onImageElementLoad(img);
        setUseChromaKey(false);
        runClassification(fileUrl);
      };
      return;
    }

    // Run AI Background Removal
    setIsRemovingBg(true);
    setBgrTaskMsg('Starting AI removal server...');
    setBgrProgressPct(1);

    removeBackground(file, {
      progress: (key, current, total) => {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        setBgrProgressPct(pct);
        if (key === 'fetch') {
          setBgrTaskMsg(`Loading AI Model Weights: ${pct}%`);
        } else if (key === 'compute') {
          setBgrTaskMsg(`Removing background: ${pct}%`);
        } else {
          setBgrTaskMsg(`Processing: ${pct}%`);
        }
      }
    })
    .then((blob) => {
      const cutoutUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.src = cutoutUrl;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setUploadedImage(img);
        // Keep original image as well
        const origImg = new Image();
        origImg.src = fileUrl;
        origImg.onload = () => {
          setOriginalImage(origImg);
        };
        
        onImageElementLoad(img);
        setIsRemovingBg(false);
        setUseChromaKey(false); // disable chroma-key if AI succeeded

        runClassification(fileUrl);
      };
    })
    .catch((err) => {
      console.warn("AI Background Removal failed, falling back to original image", err);
      // Fail gracefully: load original image instead
      setBgrTaskMsg('AI Model busy. Loading original image...');
      const img = new Image();
      img.src = fileUrl;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setUploadedImage(img);
        setOriginalImage(img);
        onImageElementLoad(img);
        setIsRemovingBg(false);
        // Enable chroma key option automatically as a replacement fallback if background is solid white/light
        setUseChromaKey(true);
        setChromaColor('#ffffff');
        setChromaTolerance(30);

        runClassification(fileUrl);
      };
    });
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setOriginalImage(null);
    setPredictions([]);
    setExtractedColors(['#94a3b8', '#0f172a', '#475569']);
    // Reset background color to a nice default crimson red
    handleConfigChange({
      backgroundColor: '#db2777',
      imageScale: 1.05,
      imageXOffset: 0,
      imageYOffset: 0
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 🚀 Elite Desktop and Mobile Dashboard Base */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Side: Layout Settings Control Column (takes 5/12 grid spaces) */}
        <section className="lg:col-span-5 w-full">
          <ControlPanel 
            config={config}
            onChange={handleConfigChange}
            onUploadImage={handleUploadImage}
            onClearImage={handleClearImage}
            hasUploadedImage={uploadedImage !== null}
            extractedColors={extractedColors}
            isRemovingBg={isRemovingBg}
            bgrProgressPct={bgrProgressPct}
            bgrTaskMsg={bgrTaskMsg}
            onRandomizeText={handleRandomizeText}
            useChromaKey={useChromaKey}
            setUseChromaKey={setUseChromaKey}
            chromaColor={chromaColor}
            setChromaColor={setChromaColor}
            chromaTolerance={chromaTolerance}
            setChromaTolerance={setChromaTolerance}
            predictions={predictions}
            isClassifying={isClassifying}
            classificationProgress={classificationProgress}
            classificationMsg={classificationMsg}
            onRunClassification={() => originalImage && runClassification(originalImage.src)}
          />
        </section>

        {/* Right Side: Real-time Live Render Canvas Area (takes 7/12 grid spaces) */}
        <section className="lg:col-span-7 w-full flex flex-col h-full justify-between gap-6">
          
          {/* Work Surface Wrapper */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center flex-1">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                Stamp Canvas Preview
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                高清拟真物理打孔锯齿 · 支持 PNG 镂空透明度导出
              </p>
            </div>

            <StampCanvas 
              config={config}
              onExtractColors={setExtractedColors}
              uploadedImage={uploadedImage}
              useChromaKey={useChromaKey}
              chromaColor={chromaColor}
              chromaTolerance={chromaTolerance}
            />
          </div>

          {/* Quick instructions panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs text-zinc-400 space-y-2">
            <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px] mb-3">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              设计说明 / Creative Instructions
            </h4>
            <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong>颜色联动：</strong> 上传图样后，Canvas 离线取样分析出占比最高的 3 种底色。点击即可瞬间刷新邮票背景色，获取大师级的配色协调。
              </li>
              <li>
                <strong>多联票自适应：</strong> 当图样比例大于 1.6 倍，格式会自动调整为“联票排版”，两张对齐拼合且中间带有虚线打孔切割线，还原经典的馆藏珍邮。
              </li>
              <li>
                <strong>微调系统：</strong> 即使抠图后的范围不够完美，也可利用底部的“缩放比例”和“位置偏移”定位钮，将主体置于画框最黄金的切割位置。
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Elegant minimalist footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 pb-8 pt-4 text-center text-xs text-zinc-600">
        <p className="flex items-center justify-center gap-1 select-none">
          AI Stamp Studio &copy; {new Date().getFullYear()} · Created with Artisan Craft
        </p>
      </footer>
    </div>
  );
}
