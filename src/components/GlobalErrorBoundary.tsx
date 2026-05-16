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
        <div style={{ padding: "24px", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Algo deu errado</h1>
          <p style={{ color: "#555", marginBottom: "16px" }}>Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 20px", background: "#22c55e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
