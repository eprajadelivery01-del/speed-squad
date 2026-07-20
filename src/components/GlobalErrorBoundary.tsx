import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log only to console (dev) — never expose to UI in production
    console.error("Uncaught error:", error, errorInfo);

    const splash = document.getElementById("splash-screen");
    if (splash) splash.remove();
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "24px",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          textAlign: "center",
          background: "linear-gradient(180deg, #0f0f0f 0%, #1a1a2e 100%)",
          color: "#ffffff",
        }}>
          {/* Logo */}
          <img
            src="/logo.png"
            alt="É Pra Já"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              marginBottom: "24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          
          <h1 style={{
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}>
            Ops! Algo deu errado
          </h1>
          
          <p style={{
            color: "rgba(255,255,255,0.6)",
            marginBottom: "24px",
            fontSize: "14px",
            lineHeight: "1.5",
            maxWidth: "300px",
          }}>
            Ocorreu um erro inesperado no aplicativo. Tente recarregar a página ou voltar ao início.
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "280px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "14px 24px",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 16px rgba(34, 197, 94, 0.3)",
              }}
            >
              🔄 Recarregar Aplicativo
            </button>
            
            <button
              onClick={() => { window.location.href = "/login"; }}
              style={{
                padding: "12px 24px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Voltar ao Login
            </button>
          </div>
          
          <div style={{ marginTop: "48px", width: "100%", maxWidth: "240px", opacity: 0.75 }}>
            <div style={{ position: "relative", width: "100%", height: "48px" }}>
              <svg viewBox="0 0 240 48" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto" }}>
                <defs>
                  <linearGradient id="err-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#b8935f" />
                    <stop offset="50%" stopColor="#e8c87a" />
                    <stop offset="100%" stopColor="#b8935f" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="18" x2="240" y2="18" stroke="url(#err-gold)" strokeWidth="1" opacity="0.6" />
                <line x1="0" y1="30" x2="240" y2="30" stroke="url(#err-gold)" strokeWidth="1" opacity="0.6" />
                <g stroke="url(#err-gold)" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 16,30 L 16,18 L 28,18 L 28,30 L 40,30 L 40,18 L 52,18 L 52,30 L 64,30 L 64,18 L 76,18 L 76,30" />
                  <path d="M 164,30 L 164,18 L 176,18 L 176,30 L 188,30 L 188,18 L 200,18 L 200,30 L 212,30 L 212,18 L 224,18 L 224,30" />
                </g>
                <g transform="translate(120, 24)">
                  <path d="M -10,0 C -6,-6 6,-6 10,0 C 6,6 -6,6 -10,0 Z" fill="url(#err-gold)" opacity="0.6" />
                  <circle cx="0" cy="0" r="2" fill="#e8c87a" />
                </g>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", top: "1px" }}>
                <span style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.35em",
                  color: "#e8c87a",
                  textShadow: "0 0 8px rgba(232,200,122,0.25)",
                  textTransform: "uppercase",
                }}>
                  B O N A S O F T
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
