import { useNavigate } from "react-router-dom";
import { COURSE_PLACEHOLDER, formatMoney } from "./courseUtils";

const CourseCard = ({ course, onDelete, deletingId = null }) => {
  const navigate = useNavigate();

  const students = course.numberOfUsersPaidForThisCourse || 0;
  const price = Number(course.price) || 0;
  const earnings = price * students;
  const isFree = course.isFree || price === 0;

  const dateLabel = course.createdAt
    ? new Date(course.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const goToCourse = () => navigate(`/AllCources/${course._id}`);

  return (
    <div
      onClick={goToCourse}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/10"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        <img
          src={course.imageCover || COURSE_PLACEHOLDER}
          alt={course.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (e.target.dataset.fallbackApplied) return;
            e.target.dataset.fallbackApplied = "1";
            e.target.src = COURSE_PLACEHOLDER;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
            isFree ? "bg-emerald-500 text-white" : "bg-white/95 text-slate-700"
          }`}
        >
          {isFree ? "Free" : "Paid"}
        </span>

        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {students.toLocaleString()}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="line-clamp-1 font-semibold text-lg text-slate-900 transition-colors group-hover:text-emerald-700">
          {course.name}
        </h3>
        {course.courseSpeciality && (
          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {course.courseSpeciality}
          </span>
        )}
        <p className="mt-1.5 line-clamp-2 min-h-[40px] text-sm leading-relaxed text-slate-500">
          {course.description}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Price
            </p>
            <p className="font-semibold text-slate-900">
              {isFree ? "Free" : formatMoney(price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Earnings
            </p>
            <p className="font-semibold text-emerald-600">{formatMoney(earnings)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>{dateLabel}</span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Manage course
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(course._id);
            }}
            disabled={deletingId === course._id}
            className="mt-4 w-full rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {deletingId === course._id ? "Deleting..." : "Delete Course"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
