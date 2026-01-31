import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Github, Instagram } from "lucide-react";
import { ThemeProvider } from "./context/ThemeProvider.jsx";

function Banners() {
  return (
    <>
      {/* 🔹 Top-left banner (Platforms) */}
{
   //  <div className="fixed top-3 left-3 z-50 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/30 text-xs md:text-sm text-gray-800 shadow-sm flex items-center gap-2 animate-fade-in">
   //     <span className="font-medium">This project available on</span>
   //     <a
   //       href="https://www.upwork.com/freelancers/~your-upwork-id"
   //       target="_blank"
   //       rel="noopener noreferrer"
   //       className="text-green-700 font-semibold hover:underline"
   //     >
   //       Upwork
   //     </a>
   //     <span className="text-gray-500">&</span>
   //     <a
   //       href="https://khamsat.com/user/your-khamsat-username"
   //       target="_blank"
   //       rel="noopener noreferrer"
   //       className="text-yellow-600 font-semibold hover:underline"
   //     >
   //       Khamsat
   //     </a>
   //   </div>
}

      {/* 🔹 Bottom-right banner (GitHub / Author) */}
      <a
        href="https://instagram.com/ornyms"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 bg-white/80 backdrop-blur-md border border-gray-200 shadow-md px-3 py-1.5 rounded-xl text-xs md:text-sm text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-300 animate-fade-in"
      >
        <Instagram size={15} className="text-gray-700" />
        <span className="font-medium">Created by</span>
        <span className="font-semibold text-primary">Ismail</span>
      </a>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
      <Banners />
    </ThemeProvider>
  </BrowserRouter>
);
