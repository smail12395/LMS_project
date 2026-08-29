import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CreditCardIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const PaymentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState(null);

  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token || role !== "instructor") {
      navigate("/login");
      return;
    }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${BACKEND_URL}/api/instructor/payment-settings/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setStatus(data.data);
    } catch (err) {
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!publishableKey.startsWith("pk_")) {
      toast.error("Publishable Key must start with pk_");
      return;
    }
    if (!secretKey.startsWith("sk_")) {
      toast.error("Secret Key must start with sk_");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/instructor/payment-settings`,
        { stripePublicKey: publishableKey, stripeSecretKey: secretKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Stripe credentials saved successfully");
        setPublishableKey("");
        setSecretKey("");
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to save credentials");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove your Stripe credentials? Students will no longer be able to purchase courses until you reconfigure them.")) return;

    setRemoving(true);
    try {
      const { data } = await axios.delete(
        `${BACKEND_URL}/api/instructor/payment-settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Stripe credentials removed");
        fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove credentials");
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Stripe Payment Setup
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure your Stripe credentials so students can purchase your courses.
            Your secret key is encrypted and never exposed to the browser.
          </p>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl border p-6 shadow-sm mb-6 ${
          status?.configured
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-center gap-3">
            {status?.configured ? (
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            ) : (
              <CreditCardIcon className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {status?.configured ? "Stripe Configured" : "Stripe Not Configured"}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                {status?.configured
                  ? "Your students can purchase courses."
                  : "You need to configure your Stripe credentials before students can purchase your courses."}
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Stripe API Credentials
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Enter the API keys from your{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline font-medium"
            >
              Stripe Dashboard
            </a>
            . These are used to process payments directly to your Stripe account.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stripe Publishable Key
              </label>
              <input
                type="text"
                placeholder="pk_live_..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stripe Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? "text" : "password"}
                  placeholder="sk_live_..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecretKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Your secret key is encrypted before storage and never exposed to the browser after saving.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !publishableKey || !secretKey}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Validating & Saving..." : "Save Credentials"}
            </button>
          </form>

          {status?.configured && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition"
              >
                <TrashIcon className="h-4 w-4" />
                {removing ? "Removing..." : "Remove Credentials"}
              </button>
            </div>
          )}
        </div>

        {/* Help */}
        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-2">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Students pay directly to your Stripe account — <strong>100% goes to you</strong>.</li>
            <li>The platform takes <strong>no commission</strong> on course sales.</li>
            <li>Your secret key is AES-256-GCM encrypted at rest in our database.</li>
            <li>You can update or remove your credentials at any time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
