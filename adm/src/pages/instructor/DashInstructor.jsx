import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BookOpenIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
  CreditCardIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import CourseCard from "../../components/instructor/CourseCard";
import { formatMoney } from "../../components/instructor/courseUtils";
import { isPreviewMode } from "../../services/dataMode";
import useInstructorLock from "../../hooks/useInstructorLock";
import {
  courses as previewCourses,
  previewMutation,
} from "../../services/previewData";

const DONUT_PALETTE = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#cbd5e1", "#94a3b8"];

const buildMonthlySeries = (courses, metric) => {
  if (!courses || courses.length === 0) return [];

  const buckets = new Map();
  courses.forEach((c) => {
    const d = c.createdAt ? new Date(c.createdAt) : new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value =
      metric === "earnings"
        ? (Number(c.price) || 0) * (c.numberOfUsersPaidForThisCourse || 0)
        : c.numberOfUsersPaidForThisCourse || 0;
    buckets.set(key, (buckets.get(key) || 0) + value);
  });

  let running = 0;
  return [...buckets.keys()]
    .sort()
    .map((key) => {
      running += buckets.get(key);
      const [y, m] = key.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        key,
        label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        value: running,
      };
    });
};

const buildRevenueData = (courses) =>
  (courses || [])
    .map((c) => ({
      _id: c._id,
      name: c.name,
      value: Math.round((Number(c.price) || 0) * (c.numberOfUsersPaidForThisCourse || 0)),
      students: c.numberOfUsersPaidForThisCourse || 0,
    }))
    .sort((a, b) => b.value - a.value);

const DashInstructor = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [metric, setMetric] = useState("users");

  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState(null);

  const { locked: instructorLocked } = useInstructorLock();

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const fetchSubscription = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/subscription/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (error) {
      console.error("Fetch subscription status error:", error.message);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (!token || role !== "instructor") {
      toast.warning("Access denied. Instructors only.");
      navigate("/login");
      return;
    }

    fetchCourses();
    fetchSubscription();
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/payment-settings/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setPaymentSettings(data.data);
    } catch (error) {
      console.error("Fetch payment settings error:", error.message);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data } = isPreviewMode
        ? await previewCourses()
        : await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this course? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(courseId);

      if (isPreviewMode) {
        previewMutation("Deleting course");
        return;
      }

      const { data } = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course deleted successfully");
        setCourses((prev) => prev.filter((course) => course._id !== courseId));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Delete error:", error.message);
      toast.error("Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  // ===== Derived stats from real course data =====
  const stats = useMemo(() => {
    const totalStudents = courses.reduce(
      (sum, c) => sum + (c.numberOfUsersPaidForThisCourse || 0),
      0
    );
    const totalEarnings = courses.reduce(
      (sum, c) => sum + (Number(c.price) || 0) * (c.numberOfUsersPaidForThisCourse || 0),
      0
    );
    return {
      totalCourses: courses.length,
      totalStudents,
      totalEarnings,
      avgEarnings: courses.length ? totalEarnings / courses.length : 0,
    };
  }, [courses]);

  const seriesData = useMemo(() => buildMonthlySeries(courses, metric), [courses, metric]);
  const revenueData = useMemo(() => buildRevenueData(courses), [courses]);
  const totalRevenue = stats.totalEarnings;

  const renderChartTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const { label, value } = payload[0].payload;
    return (
      <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
        <p className="font-medium text-slate-300">{label}</p>
        <p className="mt-0.5 font-semibold text-emerald-400">
          {metric === "earnings" ? formatMoney(value) : `${value.toLocaleString()} ${value === 1 ? "user" : "users"}`}
        </p>
      </div>
    );
  };

  const renderDonutTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const pct = totalRevenue > 0 ? Math.round((p.value / totalRevenue) * 100) : 0;
    return (
      <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
        <p className="font-medium text-slate-300">{p.name}</p>
        <p className="mt-0.5 font-semibold text-emerald-400">
          {formatMoney(p.value)} · {pct}%
        </p>
      </div>
    );
  };

  const formatAxisValue = (v) =>
    metric === "earnings" ? (v >= 1000 ? `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : `$${v}`) : `${v}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200 lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ===== Header ===== */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Instructor Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back — here's how your courses are performing.
            </p>
          </div>
          <button
            onClick={() => instructorLocked ? navigate("/payInstructor") : navigate("/AddCource")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              instructorLocked
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 focus:ring-slate-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
            }`}
          >
            {instructorLocked ? <LockClosedIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            {instructorLocked ? "Instructor Plan Required" : "New Course"}
          </button>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  subscription.subscriptionStatus === "active"
                    ? "bg-emerald-600 text-white"
                    : subscription.subscriptionStatus === "past_due" || subscription.subscriptionStatus === "grace"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-400 text-white"
                }`}>
                  <CurrencyDollarIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Instructor Plan</h2>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-emerald-600">
                      ${subscription.monthlyPrice}/mo
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      subscription.subscriptionStatus === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : subscription.subscriptionStatus === "past_due"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        subscription.subscriptionStatus === "active" ? "bg-emerald-500"
                        : subscription.subscriptionStatus === "past_due" ? "bg-rose-500"
                        : "bg-slate-400"
                      }`} />
                      {subLoading ? "Loading…" : subscription.subscriptionStatus}
                    </span>
                    <span className="text-sm text-slate-500">
                      {subscription.studentCount}/{subscription.studentLimit} students
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/payInstructor")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {subscription.subscriptionStatus === "active" ? "Manage Subscription" : "Activate Plan"}
                </button>
              </div>
            </div>
            {subscription.subscriptionStatus === "past_due" && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
                Your subscription payment failed. Update your payment method to avoid losing access.
              </div>
            )}
          </div>
        )}

        {/* Payment Settings Status */}
        {paymentSettings && !paymentSettings.configured && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <CreditCardIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Stripe Payment Setup Required</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    You need to configure your Stripe credentials before students can purchase your courses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/paymentSettings")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <CreditCardIcon className="h-4 w-4" />
                Configure Stripe Payment
              </button>
            </div>
          </div>
        )}

        {/* ===== KPI Cards ===== */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<BookOpenIcon className="h-6 w-6" />}
            iconClass="bg-emerald-600 text-white"
            title="Total Courses"
            value={String(stats.totalCourses)}
            caption="active in your catalog"
          />
          <KpiCard
            icon={<UserGroupIcon className="h-6 w-6" />}
            iconClass="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            title="Total Students"
            value={stats.totalStudents.toLocaleString()}
            caption="paid enrollments"
          />
          <KpiCard
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            iconClass="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            title="Total Earnings"
            value={formatMoney(stats.totalEarnings)}
            caption="lifetime revenue"
          />
          <KpiCard
            icon={<ChartBarIcon className="h-6 w-6" />}
            iconClass="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            title="Avg. Earnings / Course"
            value={formatMoney(stats.avgEarnings)}
            caption="across all courses"
          />
        </div>

        {/* ===== Analytics Section ===== */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Performance chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Performance Overview</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Cumulative {metric === "earnings" ? "earnings" : "users"} by month
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {[
                  { key: "users", label: "Users" },
                  { key: "earnings", label: "Earnings" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setMetric(opt.key)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                      metric === opt.key
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {courses.length === 0 ? (
              <EmptyAnalytics message="No analytics yet. Create your first course to start tracking performance here." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      dy={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={formatAxisValue}
                      width={64}
                    />
                    <Tooltip content={renderChartTooltip} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#emeraldFill)"
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue donut */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Course Revenue</h2>
            <p className="mt-0.5 text-sm text-slate-500">Share of total earnings per course</p>

            {revenueData.length === 0 ? (
              <EmptyAnalytics message="No analytics yet. Create your first course to see revenue distribution here." />
            ) : totalRevenue <= 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CurrencyDollarIcon className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="mt-4 font-medium text-slate-700">No revenue yet</p>
                <p className="mt-1 max-w-[220px] text-sm text-slate-500">
                  Earnings will appear here as students enroll in your courses.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mx-auto h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="68%"
                        outerRadius="92%"
                        paddingAngle={2}
                        cornerRadius={6}
                        strokeWidth={0}
                      >
                        {revenueData.map((entry, i) => (
                          <Cell key={entry._id} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={renderDonutTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{stats.totalCourses}</span>
                    <span className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                      Courses
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <ul className="mt-5 max-h-60 space-y-2.5 overflow-y-auto pr-1">
                  {revenueData.map((c, i) => {
                    const pct = totalRevenue > 0 ? Math.round((c.value / totalRevenue) * 100) : 0;
                    const isTop = i === 0 && c.value > 0;
                    return (
                      <li key={c._id} className="flex items-center gap-2.5 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-700">{c.name}</span>
                        {isTop && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                            Top
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">{formatMoney(c.value)}</span>
                        <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* ===== Recent Courses ===== */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Courses</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage content, videos and student answers for each course.
            </p>
          </div>
          {courses.length > 0 && (
            <button
              onClick={() => navigate("/AllCources")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              View all
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <BookOpenIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">No courses yet</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first course to start building your catalog and earning revenue.
            </p>
            <button
              onClick={() => instructorLocked ? navigate("/payInstructor") : navigate("/AddCource")}
              className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
                instructorLocked
                  ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {instructorLocked ? <LockClosedIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
              {instructorLocked ? "Instructor Plan Required" : "Create your first course"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon, iconClass, title, value, caption }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="truncate text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-emerald-600">{caption}</p>
    </div>
  </div>
);

const EmptyAnalytics = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
      <ChartBarIcon className="h-7 w-7 text-emerald-600" />
    </div>
    <p className="mt-4 max-w-[260px] text-sm text-slate-500">{message}</p>
  </div>
);

export default DashInstructor;
