"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Algo correu mal
        </h1>
        <p style={{ color: "#6b7280", maxWidth: "24rem" }}>
          Ocorreu um erro inesperado. Por favor tente novamente.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            background: "#6753FF",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
