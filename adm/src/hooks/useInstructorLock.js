import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const isLocked = (sub) => {
  if (!sub) return false;
  const overLimit =
    sub.studentLimit > 0 && sub.studentCount >= sub.studentLimit;
  if (!overLimit) return false;
  const s = sub.subscriptionStatus;
  return (
    !s ||
    s === "inactive" ||
    s === "canceled" ||
    s === "past_due" ||
    s === "grace"
  );
};

export default function useInstructorLock() {
  const [locked, setLocked] = useState(false);
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "instructor") {
      setLoading(false);
      return;
    }

    axios
      .get(`${BACKEND_URL}/api/instructor/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) {
          const d = res.data.data;
          setSub(d);
          setLocked(isLocked(d));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { locked, sub, loading };
}
