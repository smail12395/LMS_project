import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isPreviewMode } from "../services/dataMode";

const Login = () => {
  const { t } = useTranslation();
  const [state, setState] = useState("Login"); // Sign up | Login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const toggleState = () => {
    setState(state === "Sign up" ? "Login" : "Sign up");
    setName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  

    try {
      if (state === "Sign up") {
        const { data } = isPreviewMode
          ? { data: { success: true, token: "preview-user-token", name: name || "Preview User" } }
          : await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/register`, {
              name,
              email,
              password,
              phoneNumber,
            });

        if (data.success) {
          localStorage.setItem("token", data.token);
          toast.success(t('login.registeredSuccess'));
          localStorage.setItem('userName', data.name);
          window.dispatchEvent(new Event('authChange'));
          navigate("/");
        } else {
          toast.error(data.message || t('login.registrationFailed'));
        }
      } else {
        const { data } = isPreviewMode
          ? { data: { success: true, token: "preview-user-token", name: "Sarah Demo" } }
          : await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/login`, {
              email,
              password,
            });

        if (data.success) {
          localStorage.setItem("token", data.token);
          localStorage.setItem('userName', data.name);
          window.dispatchEvent(new Event('authChange'));
          navigate("/");
        } else {
          toast.error(data.message || t('login.loginFailed'));
        }
      }
    }catch (err) {
     console.error(err);
     const message =
       err.response?.data?.message ||
       err.message ||
       t('login.serverError');
   
     toast.error(message);
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/70 shadow-soft-lg overflow-hidden grid md:grid-cols-2 animate-fade-up">
        {/* Left brand panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-teal-400/20" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-1.5 text-sm font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L6.667 9.61l9.94 3.342-.615 1.823a1 1 0 01-1.905-.275l1.487-3.5a1 1 0 00-.474-1.28l-7-3zM6.75 14.17L6 12.5l-1.5 1.5-1.5-1.5.75-1.67a1 1 0 00.5.42l3 1.085a.5.5 0 000-.93L2.75 10.38A1 1 0 002 11.32v3.36a1 1 0 00.448.832l4 2.5a1 1 0 001.104 0l4-2.5A1 1 0 0012 14.68v-3.36a1 1 0 00-.75-.94l-3 1.085a.5.5 0 000 .93l1.5.545-1.5 2.86z" />
              </svg>
              {t('login.platformBadge')}
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight leading-tight">
              {t('login.headline')}
            </h2>
            <p className="mt-4 text-emerald-100 leading-relaxed">
              {t('login.subtitle')}
            </p>
          </div>

          <ul className="relative space-y-3 text-sm text-emerald-50">
            {[
              t('login.featurePaths'),
              t('login.featureVideos'),
              t('login.featureProgress'),
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/15">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Right form panel */}
        <div className="p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 md:hidden rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {t('login.platformBadge')}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-4 md:mt-0">
            {state === "Sign up" ? t('login.createAccount') : t('login.welcomeBack')}
          </h1>
          <p className="mt-2 text-slate-600">
            {state === "Sign up"
              ? t('login.signupSubtitle')
              : t('login.loginSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-8">
            {state === "Sign up" && (
              <>
                <input
                  type="text"
                  placeholder={t('login.fullName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring focus:ring-emerald-100 outline-none transition"
                  required
                />
                <input
                  type="text"
                  placeholder={t('login.phoneNumber')}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring focus:ring-emerald-100 outline-none transition"
                />
              </>
            )}

            <input
              type="email"
              placeholder={t('login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring focus:ring-emerald-100 outline-none transition"
              required
            />
            <input
              type="password"
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring focus:ring-emerald-100 outline-none transition"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 font-semibold text-white rounded-xl shadow-soft transition ${
                loading ? "bg-slate-300 cursor-not-allowed" : "btn-brand"
              }`}
            >
              {loading
                ? state === "Sign up"
                  ? t('login.registering')
                  : t('login.loggingIn')
                : state === "Sign up"
                ? t('login.signUp')
                : t('nav.login')}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-600">
            {state === "Sign up" ? t('login.haveAccount') : t('login.noAccount')}{" "}
            <span
              className="text-primary cursor-pointer font-semibold hover:underline"
              onClick={toggleState}
            >
              {state === "Sign up" ? t('login.clickToLogin') : t('login.clickToSignup')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
