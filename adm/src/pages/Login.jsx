import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { isPreviewMode } from "../services/dataMode";

const Login = () => {
  const [role, setRole] = useState("instructor"); // 'admin' or 'instructor'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const endpoint =
      role === "admin"
        ? `${import.meta.env.VITE_BACKEND_URL}/api/admin/login`
        : `${import.meta.env.VITE_BACKEND_URL}/api/instructor/login`;

    try {
      const { data } = isPreviewMode
        ? { data: { success: true, token: "preview-token" } }
        : await axios.post(endpoint, { email, password });

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", role);
        toast.success(`${role.toUpperCase()} Login Successful!`);
        role === "admin" ? navigate("/ManageInstructors") : navigate("/AllCources");
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch {
      toast.error("Server error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-600">ED AI</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        {/* Role Toggle */}
        <div className="mb-6 flex justify-center rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setRole("instructor")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              role === "instructor"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Instructor
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              role === "admin"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            required
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
