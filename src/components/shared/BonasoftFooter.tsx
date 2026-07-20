import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface BonasoftFooterProps {
  className?: string;
  compact?: boolean;
}

export function BonasoftFooter({ className, compact = false }: BonasoftFooterProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Cores adaptáveis ao tema
  const goldLight = isDark ? "hsl(42, 65%, 68%)" : "hsl(34, 45%, 42%)";
  const goldMid = isDark ? "hsl(38, 55%, 55%)" : "hsl(30, 40%, 36%)";
  const goldDark = isDark ? "hsl(34, 45%, 42%)" : "hsl(26, 38%, 28%)";
  const goldHighlight = isDark ? "hsl(46, 75%, 75%)" : "hsl(38, 55%, 48%)";

  const textColor = isDark ? goldHighlight : goldDark;

  const height = 72;
  const patternWidth = 320;

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center select-none pointer-events-none",
        compact ? "mt-10 pb-4" : "mt-14 pb-8",
        className
      )}
    >
      {/* Faixa decorativa com padrão grego meandro */}
      <div className="relative w-full max-w-[320px]" style={{ height }}>
        <svg
          viewBox={`0 0 ${patternWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bonasoft-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={goldDark} />
              <stop offset="20%" stopColor={goldMid} />
              <stop offset="50%" stopColor={goldLight} />
              <stop offset="80%" stopColor={goldMid} />
              <stop offset="100%" stopColor={goldDark} />
            </linearGradient>
            <linearGradient id="bonasoft-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={goldLight} />
              <stop offset="50%" stopColor={goldMid} />
              <stop offset="100%" stopColor={goldLight} />
            </linearGradient>
          </defs>

          {/* Linhas guia superior e inferior do padrão */}
          <line
            x1="0"
            y1={height / 2 - 14}
            x2={patternWidth}
            y2={height / 2 - 14}
            stroke={`url(#bonasoft-gold-gradient)`}
            strokeWidth="1"
            opacity="0.45"
          />
          <line
            x1="0"
            y1={height / 2 + 14}
            x2={patternWidth}
            y2={height / 2 + 14}
            stroke={`url(#bonasoft-gold-gradient)`}
            strokeWidth="1"
            opacity="0.45"
          />

          {/* Meandro grego horizontal — laterais, deixando o centro limpo para o nome */}
          <g
            stroke={`url(#bonasoft-gold-gradient)`}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.65"
          >
            {/* Lado esquerdo */}
            <path d="M 12,50 L 12,22 L 28,22 L 28,50 L 44,50 L 44,22 L 60,22 L 60,50 L 76,50 L 76,22 L 92,22 L 92,50" />
            {/* Lado direito */}
            <path d="M 228,50 L 228,22 L 244,22 L 244,50 L 260,50 L 260,22 L 276,22 L 276,50 L 292,50 L 292,22 L 308,22 L 308,50" />
          </g>

          {/* Ornamento central — palmetta estilizada */}
          <g transform={`translate(${patternWidth / 2}, ${height / 2})`}>
            <ellipse cx="0" cy="0" rx="16" ry="11" fill={`url(#bonasoft-gold-v)`} opacity="0.14" />
            <path
              d="M -12,0 C -7,-9 7,-9 12,0 C 7,9 -7,9 -12,0 Z"
              fill={`url(#bonasoft-gold-v)`}
              opacity="0.55"
            />
            <path
              d="M -20,0 C -13,-14 0,-18 0,-18 C 0,-18 13,-14 20,0 C 13,14 0,18 0,18 C 0,18 -13,14 -20,0 Z"
              stroke={`url(#bonasoft-gold-v)`}
              strokeWidth="1.2"
              fill="none"
              opacity="0.7"
            />
            <path d="M -9,-5 Q 0,-14 9,-5 Q 0,5 -9,-5" fill={goldMid} opacity="0.5" />
            <path d="M -9,5 Q 0,14 9,5 Q 0,-5 -9,5" fill={goldMid} opacity="0.5" />
            <circle cx="0" cy="0" r="2.5" fill={goldLight} />
          </g>
        </svg>

        {/* Texto B O N A S O F T sobreposto ao centro com fundo sutil */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="px-4 py-1 rounded-full"
            style={{
              background: isDark
                ? "linear-gradient(90deg, rgba(15,15,15,0) 0%, rgba(15,15,15,0.85) 20%, rgba(15,15,15,0.85) 80%, rgba(15,15,15,0) 100%)"
                : "linear-gradient(90deg, rgba(248,249,250,0) 0%, rgba(248,249,250,0.92) 20%, rgba(248,249,250,0.92) 80%, rgba(248,249,250,0) 100%)",
            }}
          >
            <span
              className="font-serif text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.32em]"
              style={{
                color: textColor,
                textShadow: isDark
                  ? `0 0 8px ${goldLight}50, 0 1px 2px rgba(0,0,0,0.6)`
                  : `0 0 6px rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.08)`,
                fontFamily: "'Playfair Display', 'Instrument Serif', Georgia, 'Times New Roman', serif",
              }}
            >
              B O N A S O F T
            </span>
          </div>
        </div>
      </div>

      {/* Tagline sutil */}
      <p
        className="text-[9px] sm:text-[10px] font-medium tracking-[0.22em] uppercase mt-1"
        style={{ color: isDark ? goldLight : goldMid, opacity: 0.7 }}
      >
        Tecnologia que entrega
      </p>
    </div>
  );
}
