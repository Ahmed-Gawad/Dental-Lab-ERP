import { createRoot } from "react-dom/client";
import App from "./App";
import { initStore } from "@/lib/db";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

function LoadingScreen() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontFamily: "Cairo, Arial, sans-serif",
        background: "#f0f7ff",
        color: "#1d4ed8",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid #bfdbfe",
          borderTopColor: "#1d4ed8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 14, fontWeight: 600 }}>جارٍ تحميل البيانات...</p>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div
      dir="rtl"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        fontFamily: "Cairo, Arial, sans-serif",
        background: "#fef2f2",
        color: "#991b1b",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 18, fontWeight: 700 }}>تعذّر تحميل البرنامج</p>
      <p style={{ fontSize: 14, maxWidth: 420 }}>
        حدث خطأ أثناء فتح قاعدة البيانات. حاول إغلاق البرنامج وفتحه مرة أخرى. إن استمرت المشكلة، تواصل مع الدعم الفني مع توضيح الخطأ.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: "8px 20px",
          background: "#991b1b",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontFamily: "inherit",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

root.render(<LoadingScreen />);

// Safety net: if store init hangs (e.g. the main process failed to open the
// database and never registered IPC handlers), don't leave the user staring
// at a spinner forever — surface an actionable error after 15s.
let settled = false;
const timeoutId = setTimeout(() => {
  if (!settled) root.render(<ErrorScreen />);
}, 15000);

initStore()
  .then(() => {
    settled = true;
    clearTimeout(timeoutId);
    root.render(<App />);
  })
  .catch((err) => {
    console.error("Failed to initialize data store:", err);
    settled = true;
    clearTimeout(timeoutId);
    root.render(<ErrorScreen />);
  });
