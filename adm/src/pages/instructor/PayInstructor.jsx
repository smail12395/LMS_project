import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowRightIcon,
  UsersIcon,
  CalendarDaysIcon,
  StopCircleIcon,
} from "@heroicons/react/24/outline";
import { isPreviewMode } from "../../services/dataMode";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const STATUS_UI = {
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircleIcon,
    color: "text-emerald-600",
  },
  past_due: {
    label: "Past Due",
    dot: "bg-rose-500",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    icon: ExclamationTriangleIcon,
    color: "text-rose-600",
  },
  grace: {
    label: "Grace Period",
    dot: "bg-amber-500",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    icon: ExclamationTriangleIcon,
    color: "text-amber-600",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-100 text-slate-700",
    icon: LockClosedIcon,
    color: "text-slate-600",
  },
  canceled: {
    label: "Canceled",
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-100 text-slate-600",
    icon: LockClosedIcon,
    color: "text-slate-500",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-red-600",
    pill: "border-red-200 bg-red-50 text-red-700",
    icon: LockClosedIcon,
    color: "text-red-600",
  },
};

const currencySymbol = (c) => {
  const s = String(c || "").toLowerCase();
  return s === "mad" ? "MAD " : "$";
};

const PayInstructor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [data, setData] = useState(null);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/instructor/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || role !== "instructor") {
      navigate("/login");
      return;
    }
    fetchStatus();
  }, []);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/instructor/subscription/checkout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        if (res.data.data?.noSubscriptionNeeded) {
          toast.info(res.data.message);
          fetchStatus();
          return;
        }
        if (res.data.data?.checkoutUrl) {
          if (res.data.data?.warning) {
            toast.info(res.data.data.warning);
          }
          window.location.href = res.data.data.checkoutUrl;
          return;
        }
        fetchStatus();
      }
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_ALREADY_ACTIVE") {
        toast.info("You already have an active subscription");
      } else {
        toast.error(err.response?.data?.message || "Failed to start subscription");
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/instructor/subscription/portal`,
        { returnUrl: window.location.origin + "/" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription? It will remain active until the end of the billing period.")) return;
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/instructor/subscription/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Subscription will be canceled at period end");
        fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel subscription");
    }
  };

  const handleResume = async () => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/instructor/subscription/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Subscription resumed!");
        fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resume subscription");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const statusUI = STATUS_UI[data.subscriptionStatus] || STATUS_UI.inactive;
  const StatusIcon = statusUI.icon;
  const isActive = data.subscriptionStatus === "active";
  const isCanceled = data.subscriptionStatus === "canceled";
  const canResume = isCanceled && data.cancelAtPeriodEnd;
  const price = data.monthlyPrice ?? 7;
  const currency = data.monthlyPriceCurrency || "usd";
  const limitReached = data.studentLimit > 0 && data.studentCount >= data.studentLimit;
  const limitWarning = data.studentLimit > 0 && data.studentCount >= data.studentLimit - 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Instructor Subscription
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your platform subscription. The monthly subscription lets you
            keep accepting students beyond the free tier limit.
          </p>
        </div>

        {/* Plan Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Instructor Plan</h2>
              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {currencySymbol(currency)}{price}<span className="text-sm font-normal text-slate-500"> / month</span>
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusUI.pill}`}>
              <span className={`h-2 w-2 rounded-full ${statusUI.dot}`} />
              {statusUI.label}
            </span>
          </div>

          {/* Student Usage */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <UsersIcon className="h-4 w-4" />
                Students
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {data.studentCount} / {data.studentLimit}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  limitReached ? "bg-red-500" : limitWarning ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, data.studentLimit > 0 ? (data.studentCount / data.studentLimit) * 100 : 0)}%`,
                }}
              />
            </div>
            {limitReached && !isActive && (
              <p className="mt-2 text-xs text-red-600">
                You've reached the student limit. Activate your subscription to continue accepting students.
              </p>
            )}
          </div>

          {/* Next Billing */}
          {data.currentPeriodEnd && (            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDaysIcon className="h-4 w-4" />
              {data.cancelAtPeriodEnd
                ? `Subscription ends: ${new Date(data.currentPeriodEnd).toLocaleDateString()}`
                : `Next billing: ${new Date(data.currentPeriodEnd).toLocaleDateString()}`}
            </div>
          )}

        </div>

        {/* Cancelled Subscription Banner */}
        {canResume && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <StopCircleIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Subscription Cancelled</p>
                <p className="mt-1 text-sm text-amber-700">
                  Your subscription remains active until{" "}
                  <strong>{new Date(data.currentPeriodEnd).toLocaleDateString()}</strong>.
                  You will not be charged again next month.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isActive && !canResume && (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CreditCardIcon className="h-5 w-5" />
              {subscribing ? "Setting up..." : `Activate Instructor Plan — ${currencySymbol(currency)}${price}/mo`}
            </button>
          )}

          {canResume && (
            <>
              <button
                onClick={handleResume}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Resume Subscription
              </button>
              {data.hasStripeCustomer && (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                  {portalLoading ? "Opening..." : "Manage Billing (update payment method, view invoices)"}
                </button>
              )}
            </>
          )}

          {!canResume && data.hasStripeCustomer && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowRightIcon className="h-5 w-5" />
              {portalLoading ? "Opening..." : "Manage Billing (update payment method, view invoices)"}
            </button>
          )}

          {isActive && !data.cancelAtPeriodEnd && (
            <button
              onClick={handleCancel}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-500 transition hover:text-rose-600 hover:border-rose-200"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-2">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>The <strong>{currencySymbol(currency)}{price}/month</strong> subscription gives you unlimited access to create and manage courses.</li>
            <li>You receive <strong>100% of every course sale</strong> — the platform takes no commission.</li>
            <li>You can have up to <strong>{data.studentLimit} active students</strong> for free without a subscription.</li>
            <li>Payments are processed automatically every month until you cancel.</li>
            <li>Cancellation takes effect at the end of the current billing period.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PayInstructor;
