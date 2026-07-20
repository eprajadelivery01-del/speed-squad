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
          
          <p style={{
            marginTop: "48px",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "4px",
            color: "rgba(255,255,255,0.2)",
            textTransform: "uppercase",
          }}>
            BONASOFT
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
