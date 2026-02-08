import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
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
  const token = localStorage.getItem("token");

  // ===== MAIN STATES =====
  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // ===== SORT & FILTER =====
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterType, setFilterType] = useState("all");

  // ===== ADD CONTENT MODAL =====
  const [showModal, setShowModal] = useState(false);
  const [contentType, setContentType] = useState("postText");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(null);

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

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

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
  .filter(Boolean) // ✅ remove undefined/null
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

  await fetchCourse(); // ✅ SAFE

  setTitle("");
  setTextContent("");
  setFile(null);
  setContentType("postText");
  setShowModal(false);
} else {
      toast.error(res.data.message || "Failed to add content");
    }
  } catch (err) {
    console.error(err);
    toast.error("Error while adding content");
  }
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
                className="text-2xl font-bold border-b w-full"
              />
            ) : (
              <h1 className="text-2xl font-bold">{course.name}</h1>
            )}

            {editMode ? (
              <textarea
                name="description"
                value={course.description}
                onChange={handleChange}
                className="w-full border rounded p-2"
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
                className="border rounded px-3 py-1 w-40"
              />
            ) : (
              <p className="font-semibold text-green-600">
                Price: ${course.price}
              </p>
            )}
          </div>

          <img
            src={course.imageCover}
            className="w-full sm:w-40 h-28 object-cover rounded-lg"
          />
        </div>

        <div className="flex justify-end mt-4">
          {editMode ? (
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-5 py-2 rounded-lg"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ===== ACTION BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg w-full sm:w-auto"
        >
          + Add Content
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="border px-3 py-1 rounded text-sm"
          >
            {sortOrder === "asc"
              ? "Oldest → Newest"
              : "Newest → Oldest"}
          </button>

          {["all", "postText", "image", "video", "pdf"].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-sm border ${
                filterType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-white"
              }`}
            >
              {type === "postText" ? "Text" : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CONTENT LIST ===== */}
      <div className="space-y-4">
        {displayedContents.map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{c.title}</h3>
              <button
                onClick={() => handleDelete(i)}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>

            {c.contentType === "postText" && <p>{c.contentData}</p>}
            {c.contentType === "image" && (
              <img src={c.contentData} className="rounded max-w-full" />
            )}
            {c.contentType === "video" && (
              <video controls src={c.contentData} className="w-full rounded" />
            )}
            {c.contentType === "pdf" && (
            <button
              onClick={() => {
                setPdfUrl(c.contentData);
                setPageNumber(1);
              }}
              className="text-indigo-600 underline"
            >
              Open PDF
            </button>
            )}
          </div>
        ))}

        {/* ===== PDF MODAL ===== */}
      {pdfUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            ref={pdfRef}
            className="bg-white rounded-xl w-full max-w-4xl p-4 relative"
          >
            {/* TOP BAR */}
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => setPdfUrl(null)}
                className="text-xl font-bold"
              >
                ✕
              </button>

              <div className="flex gap-3">
                <button onClick={() => setScale(s => Math.max(0.6, s - 0.2))}>➖</button>
                <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>➕</button>

                <a
                  href={pdfUrl}
                  download
                  className="text-indigo-600 underline"
                >
                  Download
                </a>

                <button
                  onClick={() => pdfRef.current?.requestFullscreen()}
                >
                  ⛶
                </button>
              </div>
            </div>

            {/* PDF */}
            <div className="flex justify-center overflow-auto max-h-[70vh]">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              >
                <Page pageNumber={pageNumber} scale={scale} />
              </Document>
            </div>

            {/* NAV */}
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(p => p - 1)}
              >
                ◀ Prev
              </button>

              <span>
                Page {pageNumber} of {numPages}
              </span>

              <button
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(p => p + 1)}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>



      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-bold mb-4">Add Content</h2>

            <input
              placeholder="Title"
              className="w-full border p-2 mb-3"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <select
              className="w-full border p-2 mb-3"
              value={contentType}
              onChange={e => setContentType(e.target.value)}
            >
              <option value="postText">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>

            {contentType === "postText" ? (
              <textarea
                className="w-full border p-2 mb-3"
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
              />
            ) : (
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
              />
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button
                onClick={addContent}
                className="bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
