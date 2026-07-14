import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 4000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    // Phase 1: Enter animation
    const enterTimer = setTimeout(() => setPhase("show"), 100);
    
    // Phase 2: Show for minimum duration then exit
    const showTimer = setTimeout(() => setPhase("exit"), minDuration - 500);
    
    // Phase 3: Complete and unmount
    const exitTimer = setTimeout(() => onComplete(), minDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(145deg, #f0fdf9 0%, #ffffff 40%, #f0f9ff 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right circle */}
        <div
          className={`absolute -top-20 -right-20 w-64 h-64 rounded-full transition-all duration-1000 ease-out ${
            phase === "enter" ? "opacity-0 scale-50" : "opacity-20 scale-100"
          }`}
          style={{
            background: "radial-gradient(circle, #00C9B7 0%, transparent 70%)",
            transitionDelay: "200ms",
          }}
        />
        {/* Bottom-left circle */}
        <div
          className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full transition-all duration-1000 ease-out ${
            phase === "enter" ? "opacity-0 scale-50" : "opacity-15 scale-100"
          }`}
          style={{
            background: "radial-gradient(circle, #7B61FF 0%, transparent 70%)",
            transitionDelay: "400ms",
          }}
        />
        {/* Floating dots */}
        <div
          className={`absolute top-1/4 left-1/5 w-3 h-3 rounded-full bg-[#00C9B7] transition-all duration-700 ${
            phase === "enter" ? "opacity-0 translate-y-4" : "opacity-30 translate-y-0"
          }`}
          style={{ transitionDelay: "600ms", animation: phase === "show" ? "float 3s ease-in-out infinite" : "none" }}
        />
        <div
          className={`absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-[#FFB020] transition-all duration-700 ${
            phase === "enter" ? "opacity-0 translate-y-4" : "opacity-40 translate-y-0"
          }`}
          style={{ transitionDelay: "800ms", animation: phase === "show" ? "float 2.5s ease-in-out infinite reverse" : "none" }}
        />
        <div
          className={`absolute bottom-1/3 right-1/5 w-2.5 h-2.5 rounded-full bg-[#FF5CA8] transition-all duration-700 ${
            phase === "enter" ? "opacity-0 translate-y-4" : "opacity-25 translate-y-0"
          }`}
          style={{ transitionDelay: "700ms", animation: phase === "show" ? "float 3.5s ease-in-out infinite" : "none" }}
        />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === "enter"
              ? "opacity-0 scale-90 translate-y-4"
              : "opacity-100 scale-100 translate-y-0"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp"
            alt="نشأة"
            className="w-28 h-28 object-contain drop-shadow-lg"
          />
        </div>

        {/* App name */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === "enter"
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
          style={{ transitionDelay: "350ms" }}
        >
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "#1A1F36" }}
          >
            نشأة
          </h1>
        </div>

        {/* Tagline */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === "enter"
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
          style={{ transitionDelay: "550ms" }}
        >
          <p className="text-base text-gray-500 font-medium">
            عينك عليهم
          </p>
        </div>

        {/* Loading indicator */}
        <div
          className={`mt-8 transition-all duration-700 ease-out ${
            phase === "enter"
              ? "opacity-0 scale-75"
              : "opacity-100 scale-100"
          }`}
          style={{ transitionDelay: "750ms" }}
        >
          <div className="flex gap-1.5">
            <div
              className="w-2 h-2 rounded-full bg-[#00C9B7]"
              style={{ animation: "bounce-dot 1.2s ease-in-out infinite" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-[#00C9B7]"
              style={{ animation: "bounce-dot 1.2s ease-in-out infinite 0.2s" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-[#00C9B7]"
              style={{ animation: "bounce-dot 1.2s ease-in-out infinite 0.4s" }}
            />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
