
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const Background: React.FC = () => {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const GEN_PROMPT = "A majestic eagle soaring gracefully over the lush mountains and scenic coastal roads of Taiwan during sunrise. Cinematic landscape photography, travel agency branding style, high resolution, vibrant and warm lighting.";
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2000&auto=format&fit=crop';
  const CACHE_KEY = 'tp_bg_gen_eagle_v1';

  useEffect(() => {
    const generateBackground = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setBgImage(cached);
        return;
      }

      const apiKey = process.env.API_KEY!;

      setIsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: GEN_PROMPT }],
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64Data = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              setBgImage(base64Data);
              localStorage.setItem(CACHE_KEY, base64Data);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Background generation failed:", error);
        setBgImage(FALLBACK_IMAGE);
      } finally {
        setIsLoading(false);
      }
    };

    generateBackground();
  }, []);

  const stickers = [
    { icon: '🗺️', size: 'text-4xl', duration: '30s', delay: '0s', left: '10%' },
    { icon: '🎫', size: 'text-3xl', duration: '25s', delay: '5s', left: '80%' },
    { icon: '🦅', size: 'text-5xl', duration: '35s', delay: '2s', left: '40%' },
    { icon: '🧳', size: 'text-3xl', duration: '28s', delay: '10s', left: '70%' },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-100">
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${isLoading ? 'blur-sm scale-105' : 'blur-0 opacity-40'}`}
        style={{ backgroundImage: `url('${bgImage || FALLBACK_IMAGE}')` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/40 to-slate-50/90"></div>
      
      {stickers.map((sticker, idx) => (
        <div
          key={idx}
          className="absolute animate-float opacity-20 select-none"
          style={{
            left: sticker.left,
            top: '110%',
            animationDuration: sticker.duration,
            animationDelay: sticker.delay,
          }}
        >
          <span className={`${sticker.size}`}>{sticker.icon}</span>
        </div>
      ))}

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.2; }
          90% { opacity: 0.2; }
          100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Background;
