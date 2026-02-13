import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Document, Page, pdfjs } from "react-pdf";

// ✅ REQUIRED CSS (fixes TextLayer warning)
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

// ✅ Correct worker for Vite + react-pdf
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ===== MAIN STATES =====
  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // ===== VIDEO SERIES SECTION =====
  const [videoSeries, setVideoSeries] = useState([]);
  const [loadingVideoSeries, setLoadingVideoSeries] = useState(true);

  // ===== SORT & FILTER =====
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterType, setFilterType] = useState("all");

  // ===== ADD CONTENT MODAL =====
  const [showModal, setShowModal] = useState(false);
  const [contentType, setContentType] = useState("postText");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(null);
  const [availability, setAvailability] = useState("paid");

  // ===== PDF MODAL =====
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const pdfRef = useRef(null);

  // ===== FETCH COURSE =====
  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const found = res.data.data.find(c => c._id === courseId);
      setCourse(found);
      setContents(found?.content || []);
    } catch {
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  // ===== FETCH VIDEO SERIES =====
  const fetchVideoSeries = async () => {
    try {
      setLoadingVideoSeries(true);
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/video-series`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setVideoSeries(response.data.videoSeries || []);
      }
    } catch (error) {
      console.error("Error fetching video series:", error);
      // Don't show error toast as video series is optional
    } finally {
      setLoadingVideoSeries(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    fetchVideoSeries();
  }, [courseId]);

  // ===== EDIT COURSE HANDLERS =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourse(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}`,
        {
          name: course.name,
          description: course.description,
          price: course.price
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success("Course updated successfully");
        setEditMode(false);
      }
    } catch (error) {
      toast.error("Failed to update course");
    }
  };

  // ===== DELETE CONTENT =====
  const handleDelete = async (index) => {
    if (!window.confirm("Delete this content?")) return;

    const backup = [...contents];
    setContents(contents.filter((_, i) => i !== index));

    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/content/${index}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Content deleted");
    } catch {
      setContents(backup);
      toast.error("Delete failed");
    }
  };

  // ===== SORT & FILTER =====
  const displayedContents = contents
    .filter(Boolean)
    .filter(c => filterType === "all" || c.contentType === filterType)
    .sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );

  // ===== ADD CONTENT =====
  const addContent = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (contentType === "postText" && !textContent.trim()) {
      toast.error("Text content is required");
      return;
    }

    if (contentType !== "postText" && !file) {
      toast.error("File is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("contentType", contentType);
      formData.append("availability", availability);

      if (contentType === "postText") {
        formData.append("contentData", textContent);
      } else {
        formData.append("file", file);
      }

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/content`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        toast.success("Content added");
        await fetchCourse();
        setTitle("");
        setTextContent("");
        setFile(null);
        setContentType("postText");
        setShowModal(false);
        setAvailability("paid");
      } else {
        toast.error(res.data.message || "Failed to add content");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error while adding content");
    }
  };

  // ===== NAVIGATE TO VIDEO SERIES =====
  const navigateToVideoSeries = () => {
    navigate(`/VideoSeries/${courseId}`);
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!course) return <p className="p-6">Course not found</p>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* ===== COURSE INFO ===== */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex-1 space-y-3">
            {editMode ? (
              <input
                name="name"
                value={course.name}
                onChange={handleChange}
                className="text-2xl font-bold border-b w-full px-2 py-1 rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h1 className="text-2xl font-bold">{course.name}</h1>
            )}

            {editMode ? (
              <textarea
                name="description"
                value={course.description}
                onChange={handleChange}
                className="w-full border rounded p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-600">{course.description}</p>
            )}

            {editMode ? (
              <input
                type="number"
                name="price"
                value={course.price}
                onChange={handleChange}
                className="border rounded px-3 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="font-semibold text-green-600">
                Price: ${course.price}
              </p>
            )}
          </div>

          <img
            src={course.imageCover}
            alt={course.name}
            className="w-full sm:w-40 h-28 object-cover rounded-lg shadow"
          />
        </div>

        <div className="flex justify-end mt-4">
          {editMode ? (
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Edit Course
            </button>
          )}
        </div>
      </div>

      {/* ===== VIDEO SERIES SECTION ===== */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Video Series</h2>
          <button
            onClick={navigateToVideoSeries}
            className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Manage Videos
          </button>
        </div>

        {loadingVideoSeries ? (
          <div className="flex space-x-3 overflow-hidden py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-48 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : videoSeries.length > 0 ? (
          <div className="relative">
            <div className="flex space-x-3 overflow-x-auto pb-3 scrollbar-hide">
              {videoSeries.map((video, index) => (
                <div
                  key={video._id || index}
                  onClick={navigateToVideoSeries}
                  className="flex-shrink-0 w-48 cursor-pointer group"
                >
                  <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                    <div className="relative h-28 bg-gradient-to-br from-blue-500 to-purple-600">
                      {video.videoUrl ? (
                        <img
                          src={`${video.videoUrl.replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')}`}
                          alt={video.videoTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/192x112/4F46E5/FFFFFF?text=Video";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-800 truncate mb-1">
                        {video.videoTitle || `Video ${index + 1}`}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5m16 1v-14a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z" />
                          </svg>
                          {video.quizzes?.length || 0} quizzes
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 5v2h6V5h2v2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2V5h2m0 4H5v10h14V9h-4v2h-2V9H9z" />
                          </svg>
                          #{video.order + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-blue-50 to-transparent pointer-events-none"></div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No video series yet</p>
            <button
              onClick={navigateToVideoSeries}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Create your first video series
            </button>
          </div>
        )}
      </div>

      {/* ===== ACTION BAR ===== */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Content
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortOrder === "asc" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                )}
              </svg>
              {sortOrder === "asc" ? "Oldest → Newest" : "Newest → Oldest"}
            </button>

            <div className="flex flex-wrap gap-2">
              {["all", "postText", "image", "video", "pdf"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    filterType === type
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {type === "all" ? "All" : type === "postText" ? "Text" : type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT LIST ===== */}
      <div className="space-y-4">
        {displayedContents.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No content yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first content using the "Add Content" button above.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Add your first content
            </button>
          </div>
        ) : (
          displayedContents.map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.contentType === "postText" ? "bg-blue-100 text-blue-800" :
                      c.contentType === "image" ? "bg-green-100 text-green-800" :
                      c.contentType === "video" ? "bg-purple-100 text-purple-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {c.contentType === "postText" ? "TEXT" : c.contentType.toUpperCase()}
                    </span>
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.availability === "paid" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {c.availability === "paid" ? "🔒 PAID" : "🆓 FREE"}
                     </span>
                    <span className="text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800">{c.title}</h3>
                </div>
                <button
                  onClick={() => handleDelete(i)}
                  className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 self-start"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>

              {c.contentType === "postText" && (
                <p className="text-gray-600 whitespace-pre-line">{c.contentData}</p>
              )}
              {c.contentType === "image" && (
                <div className="mt-2">
                  <img
                    src={c.contentData}
                    alt={c.title}
                    className="rounded-lg max-w-full h-auto max-h-96 object-contain"
                  />
                </div>
              )}
              {c.contentType === "video" && (
                <div className="mt-2">
                  <video
                    controls
                    src={c.contentData}
                    className="w-full rounded-lg max-h-96"
                  />
                </div>
              )}
              {c.contentType === "pdf" && (
                <button
                  onClick={() => {
                    setPdfUrl(c.contentData);
                    setPageNumber(1);
                  }}
                  className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Open PDF Document
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ===== PDF MODAL ===== */}
      {pdfUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            ref={pdfRef}
            className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
          >
            {/* TOP BAR */}
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPdfUrl(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl p-1 rounded-full hover:bg-gray-100"
                >
                  ✕
                </button>
                <span className="text-lg font-semibold text-gray-800">PDF Viewer</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                  <button
                    onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                    className="text-gray-600 hover:text-gray-800 p-1"
                    disabled={scale <= 0.6}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                    className="text-gray-600 hover:text-gray-800 p-1"
                    disabled={scale >= 2.5}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <a
                  href={pdfUrl}
                  download
                  className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>

                <button
                  onClick={() => pdfRef.current?.requestFullscreen()}
                  className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* PDF CONTENT */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  className="shadow-lg"
                >
                  <Page pageNumber={pageNumber} scale={scale} />
                </Document>
              </div>
            </div>

            {/* NAVIGATION BAR */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <button
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(p => p - 1)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    pageNumber <= 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-medium">
                    Page {pageNumber} of {numPages || '...'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={numPages}
                    value={pageNumber}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= numPages) setPageNumber(val);
                    }}
                    className="w-16 px-2 py-1 border rounded text-center"
                  />
                </div>

                <button
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(p => p + 1)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    pageNumber >= numPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD CONTENT MODAL ===== */}
// Inside the modal JSX (around line where you have the content type select):
{/* ===== MODAL CONTENT ===== */}
{showModal && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Add Content</h2>
        <button
          onClick={() => setShowModal(false)}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Title
          </label>
          <input
            placeholder="Enter content title"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Content Type Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Type
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={contentType}
            onChange={e => setContentType(e.target.value)}
          >
            <option value="postText">📝 Text Content</option>
            <option value="image">🖼️ Image</option>
            <option value="video">🎥 Video</option>
            <option value="pdf">📄 PDF Document</option>
          </select>
        </div>

        {/* ✅ NEW: Availability Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Availability
          </label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="availability"
                value="paid"
                checked={availability === "paid"}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">Paid Users Only</span>
                <span className="block text-xs text-gray-500">Only visible to users who purchased the course</span>
              </span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="availability"
                value="free"
                checked={availability === "free"}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">Everyone</span>
                <span className="block text-xs text-gray-500">Visible to all users (free preview)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Content Input (Text or File) */}
        {contentType === "postText" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Content
            </label>
            <textarea
              placeholder="Enter your text content here..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File ({contentType.toUpperCase()})
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept={
                  contentType === "image"
                    ? "image/*"
                    : contentType === "video"
                    ? "video/*"
                    : "application/pdf"
                }
                onChange={e => setFile(e.target.files[0])}
                className="w-full"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => setShowModal(false)}
            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={addContent}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all"
          >
            Add Content ({availability})
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default CourseDetails;