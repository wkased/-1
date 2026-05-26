import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { 
  Upload, Sparkles, RefreshCw, Languages, Layers, Sliders, Palette, 
  ZoomIn, ArrowUpRight, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, HelpCircle, Check, Info, Brain
} from 'lucide-react';
import { StampConfig, Language, StampStyle, POETRY_PRESETS } from '../types';
import { PredictionLabel } from '../utils';

interface ControlPanelProps {
  config: StampConfig;
  onChange: (updates: Partial<StampConfig>) => void;
  onUploadImage: (file: File, removeBg: boolean) => void;
  onClearImage: () => void;
  hasUploadedImage: boolean;
  extractedColors: string[];
  isRemovingBg: boolean;
  bgrProgressPct: number;
  bgrTaskMsg: string;
  onRandomizeText: () => void;
  // Manual Chroma key keys
  useChromaKey: boolean;
  setUseChromaKey: (val: boolean) => void;
  chromaColor: string;
  setChromaColor: (val: string) => void;
  chromaTolerance: number;
  setChromaTolerance: (val: number) => void;
  // Image recognition keys
  predictions: PredictionLabel[];
  isClassifying: boolean;
  classificationProgress: number;
  classificationMsg: string;
  onRunClassification: () => void;
}

export default function ControlPanel({
  config,
  onChange,
  onUploadImage,
  onClearImage,
  hasUploadedImage,
  extractedColors,
  isRemovingBg,
  bgrProgressPct,
  bgrTaskMsg,
  onRandomizeText,
  useChromaKey,
  setUseChromaKey,
  chromaColor,
  setChromaColor,
  chromaTolerance,
  setChromaTolerance,
  predictions,
  isClassifying,
  classificationProgress,
  classificationMsg,
  onRunClassification
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgrEnabled, setBgrEnabled] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Trigger values for predefined codes and face values depending on language
  const faceValues = config.lang === 'zh' 
    ? ['¥ 1.20', '¥ 0.80', '¥ 2.00', '¥ 5.40', '80 分', '1.20 元'] 
    : ['$ 1.50', '$ 0.50', '$ 2.00', '$ 4.80', '£ 1.10', '€ 1.45'];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0], bgrEnabled);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0], bgrEnabled);
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = config.lang === 'zh' ? 'en' : 'zh';
    const nextCountry = nextLang === 'zh' ? '中国邮政' : 'CHINA';
    
    // Choose first default poetry words to match
    const words = POETRY_PRESETS[nextLang].words;
    const phrases = POETRY_PRESETS[nextLang].phrases;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    onChange({
      lang: nextLang,
      country: nextCountry,
      title: randomWord,
      subtitle: randomPhrase,
      faceValue: nextLang === 'zh' ? '¥ 1.20' : '$ 1.50',
      code: nextLang === 'zh' ? '2026-12 (2-1) T' : '2026-STAMP-A02'
    });
  };

  return (
    <div id="control-panel" className="bg-zinc-950 text-zinc-100 rounded-2xl shadow-xl border border-zinc-800 p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
      {/* App Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            AI Stamp Studio
          </h2>
          <p className="text-xs text-zinc-400 mt-1">纯前端免费版邮票画廊生成器</p>
        </div>
        <button
          onClick={toggleLanguage}
          id="btn-lang-toggle"
          title="切换语言 / Toggle Language"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 transition-all hover:text-white"
        >
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          {config.lang === 'zh' ? '中文' : 'English'}
        </button>
      </div>

      {/* 1. Image Upload Section */}
      <div className="space-y-3">
        <label className="text-xs font-bold tracking-wider uppercase text-zinc-400 flex items-center justify-between">
          <span>01. 邮票画面图源 / IMAGE</span>
          {hasUploadedImage && (
            <button 
              onClick={onClearImage}
              id="btn-remove-image"
              className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer hover:underline"
            >
              重置图样 / Reset
            </button>
          )}
        </label>

        {/* Drag & Drop Zone */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="drag-drop-zone"
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            dragActive 
              ? 'border-amber-500 bg-amber-950/10' 
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
            id="file-input"
          />
          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 shadow-sm text-zinc-400 group-hover:text-amber-400 transition-colors">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-200">
              {dragActive ? "松开鼠标上传图片" : "点击或拖拽图片到这里上传"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">支持 PNG, JPG, WEBP, HEIC</p>
          </div>
        </div>

        {/* AI Background Removal Flag */}
        <div className="space-y-2 select-none">
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="checkbox-ai-bgr"
                checked={bgrEnabled}
                onChange={(e) => setBgrEnabled(e.target.checked)}
                className="w-4 h-4 text-amber-500 border-zinc-700 rounded bg-zinc-950 focus:ring-amber-500/20 accent-amber-500"
              />
              <label htmlFor="checkbox-ai-bgr" className="text-xs font-medium text-zinc-300 cursor-pointer">
                启用智能 AI 抠图 (浏览器本地提取主体)
              </label>
            </div>
          </div>

          {/* AI Operation State */}
          {isRemovingBg && (
            <div id="ai-loading-indicator" className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {bgrTaskMsg}
                </span>
                <span>{bgrProgressPct}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${bgrProgressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                第一次运行会下载 AI 模块(约30MB)，下载完成后将进行完全离线的快速抠图。
              </p>
            </div>
          )}

          {/* Fallback Chroma Keyer Option */}
          {hasUploadedImage && (
            <div className="mt-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox"
                    id="checkbox-chroma"
                    checked={useChromaKey}
                    onChange={(e) => setUseChromaKey(e.target.checked)}
                    className="w-4 h-4 text-amber-500 border-zinc-700 rounded bg-zinc-950 focus:ring-amber-500/20 accent-amber-500"
                  />
                  <label htmlFor="checkbox-chroma" className="text-xs font-medium text-zinc-300 cursor-pointer flex items-center gap-1">
                    简易背景扣除 (纯色过滤)
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-zinc-950 text-[10px] text-zinc-400 p-2 rounded border border-zinc-800 shadow-md hidden group-hover:block z-20 normal-case leading-normal">
                        适合背景纯白、纯黑或纯绿的图片，过滤特定颜色
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {useChromaKey && (
                <div className="space-y-2 border-t border-zinc-800 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">过滤键色：</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="color"
                        id="chroma-color-picker"
                        value={chromaColor}
                        onChange={(e) => setChromaColor(e.target.value)}
                        className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer overflow-hidden p-0"
                      />
                      <span className="font-mono text-zinc-300">{chromaColor.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>颜色公差 (Tolerance)：</span>
                      <span className="font-mono text-amber-400">{chromaTolerance}</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="150"
                      value={chromaTolerance}
                      onChange={(e) => setChromaTolerance(Number(e.target.value))}
                      className="w-full text-amber-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Local AI Image Classification Display */}
          {hasUploadedImage && (
            <div className="mt-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
                  本地 AI 视觉识别与国风撰文/ SMART LABELING
                </span>
                <button
                  onClick={onRunClassification}
                  disabled={isClassifying}
                  className="text-[10px] text-zinc-400 hover:text-emerald-400 font-medium flex items-center gap-1 transition-colors"
                  title="重新进行本地图像识别"
                >
                  <RefreshCw className={`w-3 h-3 ${isClassifying ? 'animate-spin' : ''}`} />
                  重试
                </button>
              </div>

              {/* Loader with progress */}
              {isClassifying && (
                <div className="space-y-2 p-2 bg-zinc-950/40 border border-zinc-800/40 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="animate-pulse">{classificationMsg}</span>
                    <span className="font-mono text-emerald-400">{classificationProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${classificationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Predictions Display */}
              {!isClassifying && predictions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500">
                    识别出图片前 3 大可能标签，点击可一键自动将对应的**中文标签**和**国风诗意描述**渲染至邮票画布上：
                  </p>
                  <div className="space-y-1.5">
                    {predictions.map((pred, i) => {
                      const isActive = config.title === pred.zh;
                      return (
                        <button
                          key={`${pred.original}-${i}`}
                          onClick={() => onChange({ title: pred.zh, subtitle: pred.poemZh })}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                              : 'bg-zinc-950/40 border-zinc-850 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950/80'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[13px]">{pred.zh}</span>
                              <span className="text-[9px] text-zinc-500">({pred.en})</span>
                            </div>
                            <div className={`text-[11px] ${isActive ? 'text-emerald-300/80' : 'text-zinc-400'}`}>
                              “{pred.poemZh}”
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-[9px] text-zinc-600">#{i + 1}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isClassifying && predictions.length === 0 && (
                <div className="text-center py-2">
                  <button
                    onClick={onRunClassification}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-all inline-flex items-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5 text-emerald-400" />
                    开启本地图片分类大模型
                  </button>
                </div>
              )}

              <p className="text-[9px] text-zinc-600 leading-normal flex items-start gap-1">
                <span>💡</span>
                <span>此流程基于 MobileNetV1 离线神经网络，分类运算在您浏览器内以 100% 隐私安全、0 网络开支的形式瞬时完成。</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Color Scheme & Extraction Palette */}
      <div className="space-y-3">
        <label className="text-xs font-bold tracking-wider uppercase text-zinc-400 flex items-center justify-between">
          <span>02. 邮票背景底色 / PALETTE</span>
        </label>

        {/* Extracted Colors Display */}
        {hasUploadedImage && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2.5">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              图片主体提取的推荐色 (点击切换)：
            </span>
            <div className="flex gap-2.5">
              {extractedColors.map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  onClick={() => onChange({ backgroundColor: color })}
                  id={`btn-color-extracted-${index}`}
                  className="group relative flex-1 h-9 rounded-lg border-2 transition-all flex items-center justify-center"
                  style={{ 
                    backgroundColor: color,
                    borderColor: config.backgroundColor.toLowerCase() === color.toLowerCase() ? '#ffffff' : 'rgba(255,255,255,0.1)'
                  }}
                  title={`推荐色 ${index + 1}: ${color}`}
                >
                  {config.backgroundColor.toLowerCase() === color.toLowerCase() && (
                    <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  )}
                  <span className="absolute bottom-full mb-1 bg-zinc-950 px-1.5 py-0.5 rounded text-[9px] text-white hidden group-hover:block z-10 whitespace-nowrap">
                    {color.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Color Picker */}
        <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-xs text-zinc-300">自定义底色：</span>
          <div className="flex items-center gap-2">
            <input 
              type="color" 
              id="stamp-bg-color-picker"
              value={config.backgroundColor} 
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0 p-0 overflow-hidden"
            />
            <input 
              type="text" 
              value={config.backgroundColor.toUpperCase()} 
              onChange={(e) => {
                if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                  onChange({ backgroundColor: e.target.value });
                }
              }}
              className="w-20 bg-zinc-950 border border-zinc-800 rounded-md py-1 px-1.5 text-xs text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Text & Copywriting */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold tracking-wider uppercase text-zinc-400">
            <span>03. 文案与信息 / TYPOGRAPHY</span>
          </label>
          <button
            onClick={onRandomizeText}
            id="btn-random-text"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10.5px] font-medium transition-all"
            title="重新生成诗意组合词句"
          >
            <RefreshCw className="w-3 h-3" />
            随机词句 / Shuffle
          </button>
        </div>

        <div className="space-y-3">
          {/* Title input */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[11px] text-zinc-400 font-semibold">主标题 (Title)</span>
              <span className="text-[9px] text-amber-500/80">建议 2~4 字</span>
            </div>
            <input 
              type="text"
              id="input-title"
              value={config.title}
              onChange={(e) => onChange({ title: e.target.value })}
              maxLength={20}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              placeholder="请输入邮票主标题"
            />
          </div>

          {/* Subtitle / Poetry text */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[11px] text-zinc-400 font-semibold">诗意短语 / 描述 (Description)</span>
              <span className="text-[9px] text-amber-500/80">建议 8~15 字</span>
            </div>
            <textarea 
              id="input-subtitle"
              value={config.subtitle}
              rows={2}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              maxLength={60}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 resize-none"
              placeholder="请输入邮票副标题或诗意短语"
            />
          </div>

          {/* Country selector */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-semibold">国家名称 / Region</span>
              <input 
                type="text"
                id="input-country"
                value={config.country}
                onChange={(e) => onChange({ country: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-semibold">面值 (Face Value)</span>
              <input 
                type="text"
                id="input-facevalue"
                value={config.faceValue}
                onChange={(e) => onChange({ faceValue: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                list="facevalue-list"
              />
              <datalist id="facevalue-list">
                {faceValues.map(fv => <option key={fv} value={fv} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-semibold">志号编码 / Code</span>
              <input 
                type="text"
                id="input-code"
                value={config.code}
                onChange={(e) => onChange({ code: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-semibold">发行年份 / Year</span>
              <input 
                type="text"
                id="input-year"
                value={config.year}
                onChange={(e) => onChange({ year: e.target.value })}
                maxLength={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Formatting & Style Layouts */}
      <div className="space-y-3">
        <label className="text-xs font-bold tracking-wider uppercase text-zinc-400 flex items-center justify-between">
          <span>04. 邮票排版格式 / LAYOUT STYLE</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {(['style1', 'style2', 'style3'] as StampStyle[]).map((style, index) => (
            <button
              key={style}
              onClick={() => onChange({ style })}
              id={`btn-layout-${style}`}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center flex flex-col items-center gap-1.5 ${
                config.style === style 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <div>
                <p className="font-semibold text-[11px]">样式 {index + 1}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">
                  {style === 'style1' ? '古典左竖' : style === 'style2' ? '顶部横排' : '底画极简'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Fine tuning Sliders (Spacing, radius, offsets) */}
      <div className="space-y-3">
        <label className="text-xs font-bold tracking-wider uppercase text-zinc-400 flex items-center justify-between">
          <span>05. 画布与微调 / ADVANCED SETTINGS</span>
        </label>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4 text-xs">
          {/* Perforation Details */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-300">锯齿孔洞半径 (Radius):</span>
              <span className="font-mono text-amber-400">{config.perforationRadius}px</span>
            </div>
            <input 
              type="range"
              min="4"
              max="9"
              step="0.5"
              value={config.perforationRadius}
              onChange={(e) => onChange({ perforationRadius: Number(e.target.value) })}
              className="w-full text-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-300">锯齿排列间距 (Pitch Gap):</span>
              <span className="font-mono text-amber-400">{config.perforationGap}px</span>
            </div>
            <input 
              type="range"
              min="16"
              max="35"
              value={config.perforationGap}
              onChange={(e) => onChange({ perforationGap: Number(e.target.value) })}
              className="w-full text-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="space-y-2 border-t border-zinc-800/80 pt-2.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-300">内边框间距 (Inner Padding):</span>
              <span className="font-mono text-amber-400">{config.innerBorderPadding}px</span>
            </div>
            <input 
              type="range"
              min="10"
              max="28"
              value={config.innerBorderPadding}
              onChange={(e) => onChange({ innerBorderPadding: Number(e.target.value) })}
              className="w-full text-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Image Transform Sliders (Only if image is uploaded) */}
          {hasUploadedImage && (
            <div className="space-y-3 border-t border-zinc-800/80 pt-2.5">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                主体缩放与位置微调：
              </span>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-300">缩放比例 (Scale):</span>
                  <span className="font-mono text-amber-400">{Math.round(config.imageScale * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  value={config.imageScale}
                  onChange={(e) => onChange({ imageScale: Number(e.target.value) })}
                  className="w-full text-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Position controls (Grid buttons or sliders) */}
              <div className="space-y-2">
                <span className="text-[11px] text-zinc-400">位置偏移 (X / Y Offset):</span>
                <div className="flex items-center gap-4">
                  {/* XY input fields */}
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="flex items-center bg-zinc-950 border border-zinc-850 px-2 py-1 rounded-lg">
                      <span className="text-zinc-500 font-semibold mr-1.5 font-mono">X:</span>
                      <input 
                        type="number"
                        value={config.imageXOffset}
                        onChange={(e) => onChange({ imageXOffset: Number(e.target.value) })}
                        className="w-full bg-transparent border-0 p-0 text-zinc-300 font-mono text-center focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center bg-zinc-950 border border-zinc-850 px-2 py-1 rounded-lg">
                      <span className="text-zinc-500 font-semibold mr-1.5 font-mono">Y:</span>
                      <input 
                        type="number"
                        value={config.imageYOffset}
                        onChange={(e) => onChange({ imageYOffset: Number(e.target.value) })}
                        className="w-full bg-transparent border-0 p-0 text-zinc-300 font-mono text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* D-Pad Buttons */}
                  <div className="grid grid-cols-3 gap-0.5 bg-zinc-950 p-1 border border-zinc-850 rounded-lg">
                    <div />
                    <button 
                      onClick={() => onChange({ imageYOffset: config.imageYOffset - 10 })}
                      className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                      title="向上移动"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button 
                      onClick={() => onChange({ imageXOffset: config.imageXOffset - 10 })}
                      className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                      title="向左移动"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center justify-center p-1 font-semibold text-[9px] text-zinc-500">
                      PX
                    </div>
                    <button 
                      onClick={() => onChange({ imageXOffset: config.imageXOffset + 10 })}
                      className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                      title="向右移动"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button 
                      onClick={() => onChange({ imageYOffset: config.imageYOffset + 10 })}
                      className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                      title="向下移动"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Help message */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-start gap-2 text-[10.5px] text-zinc-400">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>两联票自动分割：</strong> 上传特别宽(宽/高 &gt; 1.6)或特别长(宽/高 &lt; 0.6)的图样时，画布自动拼合为两联票样式，辅以打孔虚线贯穿，提供极高保真的艺术拟真度。
        </p>
      </div>
    </div>
  );
}
