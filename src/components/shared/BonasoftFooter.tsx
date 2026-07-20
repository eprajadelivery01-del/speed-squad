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
  const goldLight = "hsl(38, 55%, 60%)";
  const goldMid = "hsl(32, 45%, 45%)";
  const goldDark = "hsl(28, 40%, 32%)";
  const goldHighlight = "hsl(45, 70%, 72%)";
  const shadowColor = isDark ? "hsl(30, 30%, 15%)" : "hsl(30, 20%, 85%)";

  const primaryColor = isDark ? goldLight : goldDark;
  const secondaryColor = isDark ? goldHighlight : goldMid;
  const textColor = isDark ? goldHighlight : goldDark;

  const height = compact ? 56 : 80;
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
      <div className="relative w-full max-w-[360px]">
        <svg
          viewBox={`0 0 ${patternWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
          aria-hidden="true"
          style={{ filter: `drop-shadow(0 1px 1px ${shadowColor})` }}
        >
          <defs>
            <linearGradient id="bonasoft-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="25%" stopColor={secondaryColor} />
              <stop offset="50%" stopColor={primaryColor} />
              <stop offset="75%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={primaryColor} />
            </linearGradient>
            <linearGradient id="bonasoft-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={secondaryColor} />
              <stop offset="50%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>

          {/* Linha-guia superior e inferior do padrão */}
          <line
            x1="0"
            y1={height / 2 - 16}
            x2={patternWidth}
            y2={height / 2 - 16}
            stroke={`url(#bonasoft-gold-gradient)`}
            strokeWidth="1.5"
            opacity="0.8"
          />
          <line
            x1="0"
            y1={height / 2 + 16}
            x2={patternWidth}
            y2={height / 2 + 16}
            stroke={`url(#bonasoft-gold-gradient)`}
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Meandro grego horizontal — repetição simétrica */}
          <g stroke={`url(#bonasoft-gold-gradient)`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Lado esquerdo */}
            <path d="M 20,34 L 20,18 L 36,18 L 36,34 L 52,34 L 52,18 L 68,18 L 68,34 L 84,34 L 84,18 L 100,18 L 100,34" />
            {/* Lado direito */}
            <path d="M 220,34 L 220,18 L 236,18 L 236,34 L 252,34 L 252,18 L 268,18 L 268,34 L 284,34 L 284,18 L 300,18 L 300,34" />
          </g>

          {/* Ornamento central — palmetta estilizada */}
          <g transform={`translate(${patternWidth / 2}, ${height / 2})`}>
            <ellipse
              cx="0"
              cy="0"
              rx="14"
              ry="10"
              fill={`url(#bonasoft-gold-v)`}
              opacity="0.22"
            />
            <path
              d="M -10,0 C -6,-8 6,-8 10,0 C 6,8 -6,8 -10,0 Z"
              fill={`url(#bonasoft-gold-v)`}
              opacity="0.75"
            />
            <path
              d="M -18,0 C -12,-12 0,-16 0,-16 C 0,-16 12,-12 18,0 C 12,12 0,16 0,16 C 0,16 -12,12 -18,0 Z"
              stroke={`url(#bonasoft-gold-v)`}
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M -8,-4 Q 0,-12 8,-4 Q 0,4 -8,-4"
              fill={primaryColor}
              opacity="0.6"
            />
            <path
              d="M -8,4 Q 0,12 8,4 Q 0,-4 -8,4"
              fill={primaryColor}
              opacity="0.6"
            />
            <circle cx="0" cy="0" r="2.5" fill={secondaryColor} />
          </g>
        </svg>

        {/* Texto B O N A S O F T sobreposto ao centro */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: compact ? "2px" : "6px" }}
        >
          <span
            className="font-serif text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.35em]"
            style={{
              color: textColor,
              textShadow: isDark
                ? `0 0 6px ${goldLight}40, 0 1px 1px rgba(0,0,0,0.5)`
                : `0 0 4px rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.08)`,
              fontFamily: "'Playfair Display', 'Instrument Serif', Georgia, 'Times New Roman', serif",
            }}
          >
            B O N A S O F T
          </span>
        </div>
      </div>

      {/* Tagline sutil */}
      <p
        className="text-[9px] sm:text-[10px] font-medium tracking-[0.2em] uppercase mt-2"
        style={{ color: isDark ? goldLight : goldMid, opacity: 0.75 }}
      >
        Tecnologia que entrega
      </p>
    </div>
  );
}
