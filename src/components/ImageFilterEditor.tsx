"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  blur: number;
  warmth: number; // used via hue-rotate trick
}

export interface FilterPreset {
  name: string;
  emoji: string;
  settings: FilterSettings;
}

const DEFAULT_SETTINGS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
  warmth: 0,
};

const PRESETS: FilterPreset[] = [
  { name: "Original", emoji: "🔄", settings: { ...DEFAULT_SETTINGS } },
  { name: "Clarendon", emoji: "☀️", settings: { ...DEFAULT_SETTINGS, brightness: 110, contrast: 120, saturate: 130 } },
  { name: "Gingham", emoji: "🌸", settings: { ...DEFAULT_SETTINGS, brightness: 105, contrast: 90, saturate: 80, sepia: 10 } },
  { name: "Moon", emoji: "🌙", settings: { ...DEFAULT_SETTINGS, brightness: 110, contrast: 110, grayscale: 100, saturate: 0 } },
  { name: "Lark", emoji: "🐦", settings: { ...DEFAULT_SETTINGS, brightness: 115, contrast: 95, saturate: 110 } },
  { name: "Reyes", emoji: "🌅", settings: { ...DEFAULT_SETTINGS, brightness: 115, contrast: 85, saturate: 75, sepia: 22 } },
  { name: "Juno", emoji: "🔥", settings: { ...DEFAULT_SETTINGS, brightness: 105, contrast: 115, saturate: 140, sepia: 5 } },
  { name: "Slumber", emoji: "💤", settings: { ...DEFAULT_SETTINGS, brightness: 95, contrast: 90, saturate: 85, sepia: 15 } },
  { name: "Crema", emoji: "☕", settings: { ...DEFAULT_SETTINGS, brightness: 105, contrast: 95, saturate: 90, sepia: 18 } },
  { name: "Ludwig", emoji: "🎨", settings: { ...DEFAULT_SETTINGS, brightness: 105, contrast: 105, saturate: 120, hueRotate: -5 } },
  { name: "Aden", emoji: "🌊", settings: { ...DEFAULT_SETTINGS, brightness: 110, contrast: 90, saturate: 85, hueRotate: 20 } },
  { name: "Perpetua", emoji: "🌿", settings: { ...DEFAULT_SETTINGS, brightness: 108, contrast: 95, saturate: 110, hueRotate: 10 } },
  { name: "Nashville", emoji: "🎸", settings: { ...DEFAULT_SETTINGS, brightness: 108, contrast: 110, saturate: 130, sepia: 12, warmth: 15 } },
  { name: "Noir", emoji: "🖤", settings: { ...DEFAULT_SETTINGS, brightness: 95, contrast: 140, grayscale: 100, saturate: 0 } },
  { name: "Vintage", emoji: "📷", settings: { ...DEFAULT_SETTINGS, brightness: 95, contrast: 85, saturate: 70, sepia: 35 } },
];

function buildFilterCSS(s: FilterSettings): string {
  const parts: string[] = [];
  if (s.brightness !== 100) parts.push(`brightness(${s.brightness}%)`);
  if (s.contrast !== 100) parts.push(`contrast(${s.contrast}%)`);
  if (s.saturate !== 100) parts.push(`saturate(${s.saturate}%)`);
  if (s.grayscale > 0) parts.push(`grayscale(${s.grayscale}%)`);
  if (s.sepia > 0) parts.push(`sepia(${s.sepia}%)`);
  if (s.hueRotate !== 0) parts.push(`hue-rotate(${s.hueRotate + s.warmth}deg)`);
  else if (s.warmth !== 0) parts.push(`hue-rotate(${s.warmth}deg)`);
  if (s.blur > 0) parts.push(`blur(${s.blur}px)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

interface Props {
  imagePreview: string;
  onApply: (filteredDataUrl: string, filterCSS: string) => void;
  onCancel: () => void;
}

export default function ImageFilterEditor({ imagePreview, onApply, onCancel }: Props) {
  const [settings, setSettings] = useState<FilterSettings>({ ...DEFAULT_SETTINGS });
  const [activePreset, setActivePreset] = useState("Original");
  const [tab, setTab] = useState<"filters" | "adjust">("filters");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presetScrollRef = useRef<HTMLDivElement>(null);

  const filterCSS = buildFilterCSS(settings);

  const applyPreset = (preset: FilterPreset) => {
    setSettings({ ...preset.settings });
    setActivePreset(preset.name);
  };

  const updateSetting = (key: keyof FilterSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setActivePreset("Custom");
  };

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Cap at 1200px for reasonable file size
      const maxDim = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.filter = filterCSS;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onApply(dataUrl, filterCSS);
    };
    img.onerror = () => {
      // Fallback: return original with CSS filter string
      onApply(imagePreview, filterCSS);
    };
    img.src = imagePreview;
  }, [imagePreview, filterCSS, onApply]);

  // Keyboard shortcut: Enter to apply, Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.metaKey) handleApply();
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleApply, onCancel]);

  const sliders: { key: keyof FilterSettings; label: string; emoji: string; min: number; max: number; default: number }[] = [
    { key: "brightness", label: "Brightness", emoji: "☀️", min: 50, max: 150, default: 100 },
    { key: "contrast", label: "Contrast", emoji: "🔲", min: 50, max: 150, default: 100 },
    { key: "saturate", label: "Saturation", emoji: "🎨", min: 0, max: 200, default: 100 },
    { key: "sepia", label: "Sepia", emoji: "📜", min: 0, max: 100, default: 0 },
    { key: "grayscale", label: "Grayscale", emoji: "🌑", min: 0, max: 100, default: 0 },
    { key: "warmth", label: "Warmth", emoji: "🔥", min: -30, max: 30, default: 0 },
    { key: "blur", label: "Blur", emoji: "💫", min: 0, max: 10, default: 0 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Edit Image ✨</h2>
          <button
            onClick={handleApply}
            className="text-sm font-bold text-molt-purple hover:text-molt-pink"
          >
            Apply
          </button>
        </div>

        {/* Preview */}
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={imagePreview}
            alt="Edit preview"
            fill
            className="object-contain"
            style={{ filter: filterCSS }}
            unoptimized
          />
        </div>

        {/* Tab Switch */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setTab("filters")}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
              tab === "filters"
                ? "border-b-2 border-molt-purple text-molt-purple"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            🎭 Filters
          </button>
          <button
            onClick={() => setTab("adjust")}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
              tab === "adjust"
                ? "border-b-2 border-molt-purple text-molt-purple"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            ⚙️ Adjust
          </button>
        </div>

        {/* Content */}
        <div className="max-h-48 overflow-y-auto p-3">
          {tab === "filters" ? (
            <div ref={presetScrollRef} className="flex gap-3 overflow-x-auto pb-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div
                    className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                      activePreset === preset.name
                        ? "border-molt-purple ring-2 ring-molt-purple/30"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <Image
                      src={imagePreview}
                      alt={preset.name}
                      fill
                      className="object-cover"
                      style={{ filter: buildFilterCSS(preset.settings) }}
                      unoptimized
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      activePreset === preset.name
                        ? "text-molt-purple"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {preset.emoji} {preset.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sliders.map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.emoji} {s.label}
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={settings[s.key]}
                    onChange={(e) => updateSetting(s.key, Number(e.target.value))}
                    className="flex-1 accent-molt-purple"
                  />
                  <span className="w-10 text-right text-xs font-mono text-zinc-400">
                    {settings[s.key] !== s.default ? settings[s.key] : "—"}
                  </span>
                </div>
              ))}
              <button
                onClick={() => { setSettings({ ...DEFAULT_SETTINGS }); setActivePreset("Original"); }}
                className="w-full rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                🔄 Reset All
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export { buildFilterCSS, DEFAULT_SETTINGS, PRESETS };
