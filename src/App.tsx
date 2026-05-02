import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  Download, 
  Image as ImageIcon, 
  RefreshCw, 
  Trash2, 
  Settings2,
  ChevronRight,
  Maximize2,
  FileImage,
  Monitor,
  Smartphone,
  Laptop,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface GeoData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  timestamp: Date;
}

type TemplateType = 'classic' | 'badge' | 'scientific' | 'minimal';

interface Settings {
  template: TemplateType;
  fontSize: number;
  textColor: string;
  opacity: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
  showAddress: boolean;
  showCoords: boolean;
  showTimestamp: boolean;
  showDevice: boolean;
  customAddress: string;
  customCoords: string;
  customTimestamp: string;
  customDeviceText: string;
  deviceLogo: string;
  deviceBrand: string;
  margin: number;
  apiKey: string;
  useAI: boolean;
}

// --- Constants ---

const BRANDS = [
  { id: 'apple', name: 'Apple', logo: '🍎', color: '#000000', defaultModel: 'iPhone 15 Pro' },
  { id: 'samsung', name: 'Samsung', logo: '🌌', color: '#1428a0', defaultModel: 'Galaxy S24 Ultra' },
  { id: 'xiaomi', name: 'Xiaomi', logo: '🟠', color: '#ff6700', defaultModel: 'Xiaomi 14' },
  { id: 'realme', name: 'realme', logo: '🟡', color: '#FFC915', defaultModel: 'realme 7' },
  { id: 'infinix', name: 'Infinix', logo: '🟢', color: '#4cc02d', defaultModel: 'GT 20 Pro' },
  { id: 'oppo', name: 'Oppo', logo: '🟢', color: '#008b47', defaultModel: 'Find X7' },
  { id: 'vivo', name: 'Vivo', logo: '🔵', color: '#0047ff', defaultModel: 'X100' },
  { id: 'google', name: 'Google', logo: '🌐', color: '#4285f4', defaultModel: 'Pixel 8 Pro' },
  { id: 'custom', name: 'Custom', logo: '📱', color: '#000000', defaultModel: 'My Device' },
];

const DEFAULT_SETTINGS: Settings = {
  template: 'classic',
  fontSize: 24,
  textColor: '#FFFFFF',
  opacity: 0.8,
  position: 'bottom-center',
  showAddress: true,
  showCoords: true,
  showTimestamp: true,
  showDevice: true,
  customAddress: '',
  customCoords: '',
  customTimestamp: '',
  customDeviceText: '',
  deviceLogo: '📱',
  deviceBrand: 'realme',
  margin: 60,
  apiKey: '',
  useAI: false,
};

// --- Helper Functions ---

const formatCoords = (lat: number | null, lng: number | null) => {
  if (lat === null || lng === null) return 'Scanning GPS...';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

// --- Components ---

export default function GeoStamp() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<GeoData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null,
    timestamp: new Date(),
  });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const [deviceModel, setDeviceModel] = useState<string>('Generic Device');

  useEffect(() => {
    const saved = localStorage.getItem('geostamp_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('geostamp_settings', JSON.stringify(settings));
  }, [settings]);

  // Detect Device
  useEffect(() => {
    const ua = navigator.userAgent;
    let model = 'Generic Device';
    let logo = '📱';
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s([^\s;]+)/);
      model = match ? `Android ${match[1]}` : 'Android Device';
      logo = '🤖';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      model = 'iPhone';
      logo = '🍎';
    } else if (/Windows/i.test(ua)) {
      model = 'Windows PC';
      logo = '💻';
    } else if (/Macintosh/i.test(ua)) {
      model = 'MacBook';
      logo = '💻';
    }
    setDeviceModel(model);
    setSettings(s => ({ ...s, customDeviceText: model, deviceLogo: logo }));
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get Geolocation
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coordsStr = formatCoords(latitude, longitude);
        const timestampStr = `${formatDate(new Date())} | ${formatTime(new Date())}`;
        
        setGeoData(prev => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
        }));

        setSettings(s => ({ 
          ...s, 
          customCoords: s.customCoords || coordsStr,
          customTimestamp: s.customTimestamp || timestampStr
        }));

        // Reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            setGeoData(prev => ({ ...prev, address: data.display_name }));
            setSettings(s => ({ ...s, customAddress: s.customAddress || data.display_name }));
          }
        } catch (err) {
          console.error("Failed to fetch address", err);
        }
      },
      (err) => {
        setError("GPS access denied. You can still add time stamps.");
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Image Processing Logic
  const processImage = useCallback(async () => {
    if (!image) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Setup styles based on template
      const scale = canvas.width / 1000; // Relative font size scaling
      const fontSize = settings.fontSize * scale;
      const padding = settings.margin * scale; // Use dynamic margin
      const lineHeight = fontSize * 1.2;

      ctx.fillStyle = settings.textColor;
      ctx.textBaseline = 'top';

      // Template Specific Drawing
      if (settings.template === 'classic') {
        const brand = BRANDS.find(b => b.id === settings.deviceBrand) || BRANDS[BRANDS.length - 1];
        const deviceText = `Shot on ${settings.customDeviceText || deviceModel}`;
        const timeText = settings.customTimestamp || `${formatDate(geoData.timestamp)} ${formatTime(geoData.timestamp)}`;
        
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const brandWidth = ctx.measureText(brand.name).width;
        const brandPadding = 12 * scale;
        const badgeWidth = brandWidth + (brandPadding * 2);
        const badgeHeight = fontSize * 1.2;
        
        ctx.font = `${fontSize}px Inter, sans-serif`;
        const deviceWidth = ctx.measureText(deviceText).width;
        const gap = 15 * scale;
        
        const totalTopWidth = badgeWidth + gap + deviceWidth;
        
        // Final coordinates based on position
        let drawX = padding;
        if (settings.position.includes('right')) {
          drawX = canvas.width - padding - totalTopWidth;
        } else if (settings.position === 'bottom-center') {
          drawX = (canvas.width / 2) - (totalTopWidth / 2);
        } else {
          drawX = padding;
        }
        
        let drawY = padding;
        if (settings.position.includes('bottom')) {
          drawY = canvas.height - padding - (fontSize * 2.5);
        }

        // 1. Draw Brand Badge
        ctx.fillStyle = brand.color;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, badgeWidth, badgeHeight, 4 * scale);
        ctx.fill();
        
        // 2. Draw Brand Name in Badge
        ctx.fillStyle = '#FFFFFF'; // Force white for high contrast
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize * 0.8}px Inter, sans-serif`;
        ctx.fillText(brand.name, drawX + (badgeWidth / 2), drawY + (badgeHeight / 2));
        
        // 3. Draw Device Text
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillText(deviceText, drawX + badgeWidth + gap, drawY);
        
        // 4. Draw Timestamp Below (Centered to the group above)
        ctx.font = `${fontSize * 0.7}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(timeText, drawX + (totalTopWidth / 2), drawY + badgeHeight + (8 * scale));

        setProcessedImage(canvas.toDataURL('image/jpeg', 0.95));
        setIsProcessing(false);
        return;
      }

      // Prepare text lines for other templates
      const textLines: string[] = [];
      
      if (settings.showAddress) {
         const addrText = settings.customAddress || geoData.address || '';
         if (addrText) {
           const maxWidth = canvas.width * 0.4;
           const words = addrText.split(', ');
           let line = '';
           for (let n = 0; n < words.length; n++) {
             let testLine = line + words[n] + ', ';
             let metrics = ctx.measureText(testLine);
             if (metrics.width > maxWidth && n > 0) {
               textLines.push(line);
               line = words[n] + ', ';
             } else {
               line = testLine;
             }
           }
           textLines.push(line.replace(/, $/, ''));
         }
      }
      
      if (settings.showCoords) {
        const coordsText = settings.customCoords || formatCoords(geoData.latitude, geoData.longitude);
        textLines.push(coordsText);
      }
      
      if (settings.showTimestamp) {
        const timeText = settings.customTimestamp || `${formatDate(geoData.timestamp)} | ${formatTime(geoData.timestamp)}`;
        textLines.push(timeText);
      }

      if (settings.showDevice) {
        const text = settings.customDeviceText || deviceModel;
        const brand = BRANDS.find(b => b.id === settings.deviceBrand);
        const prefix = brand?.id === 'custom' ? settings.deviceLogo : brand?.logo || '📱';
        textLines.push(`${prefix} Shot on ${text}`);
      }

      // Calculate position
      let startX = padding;
      let startY = padding;

      if (settings.position.includes('right')) {
        ctx.textAlign = 'right';
        startX = canvas.width - padding;
      } else {
        ctx.textAlign = 'left';
      }

      if (settings.position.includes('bottom')) {
        startY = canvas.height - padding - (textLines.length * lineHeight);
      }

      // Template Specific Backgrounds
      if (settings.template === 'badge') {
        const longestLine = Math.max(...textLines.map(l => ctx.measureText(l).width));
        const bgWidth = longestLine + padding;
        const bgHeight = (textLines.length * lineHeight) + padding;
        
        ctx.globalAlpha = settings.opacity;
        ctx.fillStyle = '#000000';
        
        const rectX = settings.position.includes('right') ? canvas.width - bgWidth - (padding/2) : padding/2;
        const rectY = startY - (padding/2);
        
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, bgWidth, bgHeight, 10 * scale);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = settings.textColor;
      }

      if (settings.template === 'scientific') {
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
      } else if (settings.template === 'minimal') {
        ctx.font = `300 ${fontSize * 0.8}px Inter, sans-serif`;
        ctx.letterSpacing = '2px';
      } else {
        ctx.font = `${fontSize}px Inter, sans-serif`;
      }

      // Draw text
      textLines.forEach((line, i) => {
        ctx.fillText(line, startX, startY + (i * lineHeight));
      });

      setProcessedImage(canvas.toDataURL('image/jpeg', 0.9));
      setIsProcessing(false);
    };
  }, [image, geoData, settings]);

  useEffect(() => {
    if (image) {
      processImage();
    }
  }, [image, geoData, settings, processImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setZoom(1); // Reset zoom on new image
        fetchLocation(); // Refresh location when a new image is loaded
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.download = `GeoStamp_${new Date().getTime()}.jpg`;
    link.href = processedImage;
    link.click();
  };

  const clearImage = () => {
    setImage(null);
    setProcessedImage(null);
    setZoom(1);
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#1A1A1A] font-sans selection:bg-orange-200">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Camera className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">GeoStamp</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <div className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full flex items-center gap-1.5 border border-red-100">
              <Info size={12} />
              {error}
            </div>
          )}
          {geoData.latitude && (
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-[#8E9299] bg-[#EAEAEA] px-3 py-1.5 rounded-full">
              <MapPin size={10} className="text-black" />
              {formatCoords(geoData.latitude, geoData.longitude)}
            </div>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Preview Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative aspect-[4/3] md:aspect-[16/9] bg-[#E5E5E5] rounded-2xl overflow-hidden shadow-2xl border border-white group">
            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#DDD] transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg mb-4">
                  <ImageIcon className="w-8 h-8 text-[#888]" />
                </div>
                <p className="text-sm font-medium text-[#666]">Drop image or click to upload</p>
                <p className="text-[10px] text-[#999] mt-1 uppercase tracking-widest font-bold">Support JPG, PNG</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4 scrollbar-hide">
                <AnimatePresence mode="wait">
                  {processedImage && (
                    <motion.img 
                      key="processed"
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1,
                        scale: zoom,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      src={processedImage} 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-sm transition-transform cursor-grab active:cursor-grabbing"
                      style={{ transformOrigin: 'center' }}
                      alt="Geo-stamped preview"
                    />
                  )}
                </AnimatePresence>
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <RefreshCw className="animate-spin text-black" size={32} />
                  </div>
                )}
              </div>
            )}
            
            {image && (
              <>
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <button 
                    onClick={clearImage}
                    className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg transition-transform active:scale-95"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Zoom Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl font-bold">−</span>
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <span className="text-[10px] font-mono w-12 text-center font-bold">
                    {Math.round(zoom * 100)}%
                  </span>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button 
                    onClick={() => setZoom(prev => Math.min(5, prev + 0.2))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl font-bold">+</span>
                  </button>
                  <button 
                    onClick={() => setZoom(1)}
                    className="bg-black text-white text-[10px] px-3 py-2 rounded-lg font-bold ml-2 hover:bg-gray-800 transition-colors"
                  >
                    RESET
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Action Bar */}
          {processedImage && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-[#E5E5E5]"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">File Size</span>
                  <span className="text-xs font-medium">Auto-optimized</span>
                </div>
                <div className="w-[1px] h-8 bg-[#EEE]" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Format</span>
                  <span className="text-xs font-medium">JPEG 90%</span>
                </div>
              </div>
              
              <button 
                onClick={downloadImage}
                className="flex items-center gap-2 bg-black hover:bg-[#333] text-white px-6 py-2.5 rounded-full font-medium transition-all active:scale-95"
              >
                <Download size={18} />
                Download Image
              </button>
            </motion.div>
          )}
        </div>

        {/* Right: Controls Area */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5E5]">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 size={18} />
              <h2 className="font-bold text-sm uppercase tracking-wider">STAMP CONFIG</h2>
            </div>

            <div className="space-y-6">
              {/* Template Picker */}
              <div>
                <label className="text-[11px] font-bold text-[#8E9299] uppercase mb-3 block tracking-widest">Aesthetic Template</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['classic', 'badge', 'scientific', 'minimal'] as TemplateType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings(s => ({ ...s, template: t }))}
                      className={`flex flex-col gap-2 p-3 rounded-xl text-xs font-medium border transition-all group overflow-hidden ${
                        settings.template === t 
                        ? 'bg-black border-black text-white shadow-md' 
                        : 'bg-white border-[#E5E5E5] hover:border-[#CCC]'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span>{t.charAt(0)?.toUpperCase() + t.slice(1)}</span>
                        {settings.template === t && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      </div>
                      
                      {/* Mini Preview Box */}
                      <div className={`mt-1 h-12 w-full rounded-md flex items-center justify-center overflow-hidden border ${
                        settings.template === t ? 'bg-[#222] border-white/10' : 'bg-[#F9F9F9] border-[#EEE]'
                      }`}>
                        {t === 'classic' && (
                          <div className="text-[8px] font-sans text-center px-2">
                            LAT: -6.1751<br/>TIME: 14:30
                          </div>
                        )}
                        {t === 'badge' && (
                          <div className={`text-[7px] font-sans px-2 py-1 rounded bg-black text-white border border-white/20 scale-90 ${settings.template === t ? 'bg-white/10' : ''}`}>
                            JAKARTA, ID
                          </div>
                        )}
                        {t === 'scientific' && (
                          <div className="text-[7px] font-mono text-center px-1 tracking-tight">
                            # GPS_LOCK: 0.98<br/>REF: 104.22.8
                          </div>
                        )}
                        {t === 'minimal' && (
                          <div className="text-[8px] font-light uppercase tracking-[0.2em] text-center">
                            12.05.26
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Picker */}
              <div>
                <label className="text-[11px] font-bold text-[#8E9299] uppercase mb-3 block tracking-widest">Corner Placement</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSettings(s => ({ ...s, position: p }))}
                      className={`h-12 rounded-lg border flex items-center justify-center transition-all ${
                        settings.position === p 
                        ? 'bg-[#EEE] border-black' 
                        : 'bg-white border-[#EEE]'
                      }`}
                    >
                      <div className={`w-3 h-3 bg-current opacity-40 rounded-sm ${
                        p === 'top-left' ? 'mb-4 mr-4' : 
                        p === 'top-right' ? 'mb-4 ml-4' : 
                        p === 'bottom-left' ? 'mt-4 mr-4' : 
                        p === 'bottom-center' ? 'mt-4' : 'mt-4 ml-4'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Sliders */}
              <div className="space-y-4 pt-2 border-t border-[#F5F5F5]">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest">Edge Margin (WhatsApp Fix)</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSettings(s => ({ ...s, margin: 150 }))}
                        className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold"
                      >
                        WA SAFE
                      </button>
                      <span className="text-[10px] font-mono">{settings.margin}px</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="300" value={settings.margin} 
                    onChange={(e) => setSettings(s => ({ ...s, margin: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#EEE] rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <p className="text-[9px] text-gray-400">Besarkan margin jika watermark terpotong di WhatsApp.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest">Text Size</label>
                    <span className="text-[10px] font-mono">{settings.fontSize}px</span>
                  </div>
                  <input 
                    type="range" min="12" max="64" value={settings.fontSize} 
                    onChange={(e) => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#EEE] rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest">Opacity</label>
                    <span className="text-[10px] font-mono">{Math.round(settings.opacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="1" step="0.1" value={settings.opacity} 
                    onChange={(e) => setSettings(s => ({ ...s, opacity: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#EEE] rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-3 pt-4 border-t border-[#F5F5F5]">
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest mb-2 block">Overlay Content</label>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'showAddress', label: 'Include Address', icon: MapPin },
                    { key: 'showCoords', label: 'Include GPS Coords', icon: Maximize2 },
                    { key: 'showTimestamp', label: 'Include Date & Time', icon: Clock },
                    { key: 'showDevice', label: 'Include Device Info', icon: Smartphone },
                  ].map((item) => {
                    const isVisible = settings[item.key as keyof Settings] as boolean;
                    const customKeyMap: Record<string, string> = {
                      showAddress: 'customAddress',
                      showCoords: 'customCoords',
                      showTimestamp: 'customTimestamp',
                      showDevice: 'customDeviceText'
                    };
                    const customKey = customKeyMap[item.key];

                    return (
                      <div key={item.key} className="space-y-2">
                        <label className="flex items-center justify-between p-3 bg-[#F9F9F9] rounded-xl cursor-pointer hover:bg-[#F0F0F0] transition-colors">
                          <div className="flex items-center gap-3">
                            <item.icon size={14} className="text-[#8E9299]" />
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={isVisible}
                            onChange={(e) => setSettings(s => ({ ...s, [item.key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-[#DDD] text-black focus:ring-0"
                          />
                        </label>
                        
                        {/* Edit Inputs for All Items */}
                        {isVisible && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="pl-4 pt-1 pb-3 space-y-3 border-l-2 border-[#EEE] ml-4 overflow-hidden"
                          >
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[9px] font-bold text-[#AAA] uppercase block">Edit Text</label>
                                <button 
                                  onClick={() => {
                                    if (item.key === 'showDevice') setSettings(s => ({ ...s, customDeviceText: deviceModel }));
                                    if (item.key === 'showCoords') setSettings(s => ({ ...s, customCoords: formatCoords(geoData.latitude, geoData.longitude) }));
                                    if (item.key === 'showTimestamp') setSettings(s => ({ ...s, customTimestamp: `${formatDate(geoData.timestamp)} | ${formatTime(geoData.timestamp)}` }));
                                    if (item.key === 'showAddress') setSettings(s => ({ ...s, customAddress: geoData.address || '' }));
                                  }}
                                  className="text-[9px] text-blue-500 hover:underline"
                                >
                                  Reset
                                </button>
                              </div>
                              {item.key === 'showAddress' ? (
                                <textarea 
                                  value={settings.customAddress}
                                  onChange={(e) => setSettings(s => ({ ...s, customAddress: e.target.value }))}
                                  rows={2}
                                  className="w-full text-xs p-2 bg-[#F5F5F5] border border-transparent focus:border-black focus:bg-white transition-all rounded-lg outline-none resize-none"
                                />
                              ) : (
                                <input 
                                  type="text"
                                  value={settings[customKey as keyof Settings] as string}
                                  onChange={(e) => setSettings(s => ({ ...s, [customKey]: e.target.value }))}
                                  className="w-full text-xs p-2 bg-[#F5F5F5] border border-transparent focus:border-black focus:bg-white transition-all rounded-lg outline-none"
                                />
                              )}
                            </div>
                            
                            {item.key === 'showDevice' && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[9px] font-bold text-[#AAA] uppercase mb-2 block">Choose Brand</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {BRANDS.map(brand => (
                                      <button
                                        key={brand.id}
                                        onClick={() => setSettings(s => ({ 
                                          ...s, 
                                          deviceBrand: brand.id,
                                          customDeviceText: s.customDeviceText === deviceModel ? brand.defaultModel : s.customDeviceText
                                        }))}
                                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                                          settings.deviceBrand === brand.id 
                                          ? 'bg-black border-black text-white' 
                                          : 'bg-[#F9F9FB] border-[#EEE] hover:border-[#DDD] text-[#555]'
                                        }`}
                                      >
                                        <span className="text-sm">{brand.logo}</span>
                                        <span className="truncate w-full text-center">{brand.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {settings.deviceBrand === 'custom' && (
                                  <div>
                                    <label className="text-[9px] font-bold text-[#AAA] uppercase mb-1.5 block">Custom Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                      {['📱', '🍎', '🤖', '📷', '⭐', '🔥', '📍', '💎', '🎨'].map(logo => (
                                        <button
                                          key={logo}
                                          onClick={() => setSettings(s => ({ ...s, deviceLogo: logo }))}
                                          className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm transition-all ${
                                            settings.deviceLogo === logo 
                                            ? 'bg-black border-black text-white' 
                                            : 'bg-white border-[#EEE] hover:border-[#CCC]'
                                          }`}
                                        >
                                          {logo}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* API Management Panel */}
              <div className="space-y-4 pt-6 border-t border-[#F5F5F5]">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 size={14} className="text-blue-500" />
                  <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">API & Advanced</label>
                </div>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-700 uppercase">Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                        placeholder={process.env.GEMINI_API_KEY ? "Using System Key (Active)" : "Enter API Key..."}
                        className="w-full text-xs p-2.5 bg-white border border-blue-200 focus:border-blue-500 transition-all rounded-lg outline-none pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className={`w-2 h-2 rounded-full ${settings.apiKey || process.env.GEMINI_API_KEY ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`} />
                      </div>
                    </div>
                    <p className="text-[8px] text-blue-600/70 mt-1 italic">
                      Digunakan untuk fitur AI generatif saat diekspor.
                    </p>
                  </div>

                  <label className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer border border-blue-100">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={12} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-700 uppercase">AI Smart Caption</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.useAI}
                      onChange={(e) => setSettings(s => ({ ...s, useAI: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-blue-200 text-blue-500 focus:ring-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-black text-white rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-bold text-sm mb-2">GPS Accuracy</h3>
              <p className="text-[11px] text-white/70 leading-relaxed mb-4">
                GeoStamp works best outdoors for satellite locking. We utilize reverse-geocoding to turn raw coordinates into addresses.
              </p>
              <div className="bg-white/10 px-3 py-2 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/50">Current Drift</span>
                <span className="text-xs font-mono text-green-400">± {geoData.accuracy?.toFixed(1) || '--'}m</span>
              </div>
            </div>
            <div className="absolute top-[-50%] right-[-50%] w-[150%] h-[150%] bg-gradient-radial from-white/5 to-transparent pointer-events-none group-hover:from-white/10 transition-all duration-700" />
          </div>
        </div>
      </main>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* File Input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      <footer className="fixed bottom-0 left-0 right-0 py-3 px-6 bg-white/50 backdrop-blur-sm border-t border-[#E5E5E5] flex justify-between items-center text-[10px] font-bold text-[#AAA] tracking-widest uppercase">
        <span>&copy; 2026 GEOSTAMP STUDIO</span>
        <span className="flex items-center gap-1">
          LOCAL PROCESSING <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
        </span>
      </footer>
    </div>
  );
}
