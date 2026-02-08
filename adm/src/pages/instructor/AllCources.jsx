import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AllCources = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 🔐 Check instructor access
  useEffect(() => {
    if (!token || role !== "instructor") {
      toast.warning("Access denied. Instructors only.");
      navigate("/login");
      return;
    }

    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      console.log("📡 Fetching instructor courses...");

      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ API response:", data);

      if (data.success) {
        setCourses(data.data);
      } else {
        toast.error("Failed to load courses");
      }
    } catch (error) {
      console.error(
        "❌ Fetch courses error:",
        error.response?.data || error.message
      );
      toast.error("Something went wrong while fetching courses");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading courses...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            My Courses
          </h1>

          <button
            onClick={() => navigate("/AddCource")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-semibold"
          >
            + Add Course
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            You haven’t created any courses yet.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course._id}
                onClick={() => navigate(`/AllCources/${course._id}`)}
                className="
                  bg-white rounded-2xl shadow-md overflow-hidden
                  cursor-pointer
                  hover:shadow-xl hover:-translate-y-1
                  transition-all duration-300
                "
              >
                <img
                  src={course.imageCover}
                  alt={course.name}
                  className="h-48 w-full object-cover"
                />

                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-800 mb-1">
                    {course.name}
                  </h2>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-indigo-600 font-bold">
                      ${course.price}
                    </span>

                    <span className="text-xs text-gray-400">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllCources;
