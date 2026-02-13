import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const VideoSeries = () => {
  const { courseId } = useParams();
  const token = localStorage.getItem("token");

  /* ===================== EXISTING VIDEOS ===================== */
  const [existingVideos, setExistingVideos] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [deletingVideoId, setDeletingVideoId] = useState(null);

  /* ===================== NEW VIDEOS ===================== */
  const [videoCount, setVideoCount] = useState(1);
  const [videos, setVideos] = useState([]);
  const [saving, setSaving] = useState(false);

  /* ===================== QUIZ MODAL ===================== */
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);
  const [modalQuizzes, setModalQuizzes] = useState([]);

  /* ===================== DELETE VIDEO FUNCTION ===================== */
  const showConfirmDialog = useCallback((title, message, confirmText, cancelText) => {
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}\n\nClick OK to ${confirmText.toLowerCase()} or Cancel to ${cancelText.toLowerCase()}.`);
      resolve(result);
    });
  }, []);

  const deleteVideo = async (videoId, videoTitle) => {
    // Debug: Log what we're receiving
    console.log("deleteVideo called with:", { videoId, videoTitle, type: typeof videoId });
    
    // FIX: Handle object IDs properly
    const getVideoIdString = (id) => {
      if (!id) return null;
      if (typeof id === 'string') return id;
      if (id.$oid) return id.$oid; // For MongoDB object format
      if (id.toString) return id.toString();
      return String(id);
    };

    const videoIdString = getVideoIdString(videoId);
    
    if (!videoIdString) {
      console.error("Cannot get video ID string from:", videoId);
      toast.error("Video ID is missing. Cannot delete.");
      return;
    }

    console.log("Deleting video with ID string:", videoIdString);
    
    const confirmed = await showConfirmDialog(
      `Delete "${videoTitle}"?`,
      `This will permanently delete the video and all its quizzes.\nThe video file will also be removed from Cloudinary storage.`,
      "Delete",
      "Cancel"
    );
    
    if (!confirmed) return;

    setDeletingVideoId(videoIdString);
    
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/video-series/${videoIdString}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(
          `${videoTitle} deleted successfully` +
          (response.data.deletedVideo?.hadCloudinaryCleanup ? " (Cloudinary cleaned)" : "")
        );
        
        // FIX: Optimistic UI update with proper ID comparison
        setExistingVideos(prev => prev.filter(video => {
          const currentVideoId = getVideoIdString(video._id);
          return currentVideoId !== videoIdString;
        }));
        
        // Show remaining count
        if (response.data.remainingCount === 0) {
          toast.info("No videos remaining in this series");
        }
      }
    } catch (error) {
      console.error("Delete error details:", error);
      
      let errorMessage = "Failed to delete video";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      }
      
      toast.error(errorMessage);
    } finally {
      setDeletingVideoId(null);
    }
  };

  /* ===================== FETCH EXISTING ===================== */
  useEffect(() => {
    const fetchExistingVideos = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/video-series`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("API Response for existing videos:", res.data); // Debug log
        
        if (res.data.success) {
          // Debug: Check if _id exists in response
          console.log("First video in response:", res.data.videoSeries?.[0]);
          console.log("First video _id:", res.data.videoSeries?.[0]?._id);
          
          setExistingVideos(res.data.videoSeries || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load existing videos");
      } finally {
        setLoadingExisting(false);
      }
    };

    fetchExistingVideos();
  }, [courseId, token]);

  /* ===================== INITIALIZE VIDEOS ===================== */
  useEffect(() => {
    const newVideos = [];
    for (let i = 0; i < videoCount; i++) {
      newVideos.push({
        title: "",
        file: null,
        preview: null,
        quizzes: [],
      });
    }
    setVideos(newVideos);
  }, [videoCount]);

  /* ===================== HANDLE VIDEO CHANGE ===================== */
  const handleVideoChange = useCallback((index, field, value) => {
    setVideos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  /* ===================== HANDLE QUIZ CHANGE ===================== */
  const handleQuizChange = useCallback((quizIndex, field, value) => {
    setModalQuizzes(prev => {
      const updated = [...prev];
      updated[quizIndex] = { ...updated[quizIndex], [field]: value };
      return updated;
    });
  }, []);

  /* ===================== HANDLE OPTION CHANGE ===================== */
  const handleOptionChange = useCallback((quizIndex, optionIndex, value) => {
    setModalQuizzes(prev => {
      const updated = [...prev];
      const newOptions = [...updated[quizIndex].options];
      newOptions[optionIndex] = value;
      updated[quizIndex] = { ...updated[quizIndex], options: newOptions };
      return updated;
    });
  }, []);

  /* ===================== OPEN QUIZ MODAL ===================== */
  const openQuizModal = (index) => {
    setActiveVideoIndex(index);
    setModalQuizzes([...videos[index].quizzes]);
    setShowQuizModal(true);
  };

  /* ===================== SAVE QUIZZES ===================== */
  const saveQuizzes = () => {
    const updatedVideos = [...videos];
    updatedVideos[activeVideoIndex].quizzes = [...modalQuizzes];
    setVideos(updatedVideos);
    setShowQuizModal(false);
    setActiveVideoIndex(null);
  };

  /* ===================== ADD NEW QUIZ ===================== */
  const addNewQuiz = () => {
    setModalQuizzes(prev => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10
      }
    ]);
  };

  /* ===================== REMOVE QUIZ ===================== */
  const removeQuiz = (index) => {
    setModalQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  /* ===================== SAVE ALL VIDEOS ===================== */
  const saveAllVideos = async () => {
    // Validate all videos
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (!video.title.trim()) {
        toast.error(`Video ${i + 1} must have a title`);
        return;
      }
      if (!video.file) {
        toast.error(`Video ${i + 1} must have a file selected`);
        return;
      }
      if (video.file.size > 100 * 1024 * 1024) {
        toast.error(`Video ${i + 1} must be under 100MB (current: ${(video.file.size / (1024 * 1024)).toFixed(2)}MB)`);
        return;
      }
    }

    try {
      setSaving(true);
      
      const formData = new FormData();
      const existingCount = existingVideos.length;
      
      // Add videos and metadata
      videos.forEach((video, index) => {
        formData.append("videos", video.file);
        
        // Stringify metadata with correct order (existing count + index)
        const metadata = {
          videoTitle: video.title,
          quizzes: video.quizzes || [],
          order: existingCount + index
        };
        formData.append("meta", JSON.stringify(metadata));
      });

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/video-series`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success(`${response.data.uploaded} videos uploaded successfully!`);
        
        // Reset form
        setVideoCount(1);
        setVideos([]);
        
        // Refresh existing videos
        setLoadingExisting(true);
        const refreshed = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}/video-series`,
          { 
            headers: { Authorization: `Bearer ${token}` } 
          }
        );
        setExistingVideos(refreshed.data.videoSeries || []);
        setLoadingExisting(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ===================== RENDER QUIZ MODAL ===================== */
  const renderQuizModal = () => {
    if (!showQuizModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">
              Manage Quizzes for Video {activeVideoIndex + 1}
            </h2>
            <button
              onClick={() => setShowQuizModal(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {modalQuizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No quizzes added yet. Click "Add Quiz" to start.
              </div>
            ) : (
              modalQuizzes.map((quiz, quizIndex) => (
                <div key={quizIndex} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-700">
                      Quiz {quizIndex + 1}
                    </h3>
                    <button
                      onClick={() => removeQuiz(quizIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Question Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={quiz.question}
                      onChange={(e) => handleQuizChange(quizIndex, "question", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter the question..."
                    />
                  </div>

                  {/* Options */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options (Select the correct one)
                    </label>
                    {[0, 1, 2, 3].map((optionIndex) => (
                      <div key={optionIndex} className="flex items-center mb-2">
                        <input
                          type="radio"
                          name={`correct-${quizIndex}`}
                          checked={quiz.correctAnswer === optionIndex}
                          onChange={() => handleQuizChange(quizIndex, "correctAnswer", optionIndex)}
                          className="mr-2"
                        />
                        <input
                          type="text"
                          value={quiz.options[optionIndex] || ""}
                          onChange={(e) => handleOptionChange(quizIndex, optionIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quiz.points}
                      onChange={(e) => handleQuizChange(quizIndex, "points", parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t p-6 flex justify-between items-center">
            <button
              onClick={addNewQuiz}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              + Add Quiz
            </button>
            <div className="space-x-3">
              <button
                onClick={() => setShowQuizModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveQuizzes}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Quizzes ({modalQuizzes.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to get video ID string
  const getVideoIdString = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id.toString) return id.toString();
    return String(id);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ================= TIMELINE BAR SECTION ================= */}
      {existingVideos.length > 0 && !loadingExisting && (
        <section className="mb-10">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Video Series Timeline</h3>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm">
                {existingVideos.length} Videos
              </span>
            </div>
            
            {/* Timeline Container */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-indigo-200 to-purple-200 -translate-y-1/2 z-0"></div>
              
              {/* Timeline Nodes */}
              <div className="relative z-10 flex items-center justify-between">
                {existingVideos
                  .sort((a, b) => a.order - b.order)
                  .map((video, index, array) => {
                    const videoId = getVideoIdString(video._id);
                    const isLast = index === array.length - 1;
                    
                    return (
                      <div key={videoId || index} className="flex flex-col items-center flex-1">
                        {/* Timeline Node */}
                        <div 
                          className="relative w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg group"
                          title={`Video ${video.order + 1}: ${video.videoTitle}`}
                        >
                          <span className="text-white font-bold text-sm">
                            {video.order + 1}
                          </span>
                          
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                            <div className="font-semibold">{video.videoTitle || `Video ${video.order + 1}`}</div>
                            <div className="text-gray-300">
                              {video.quizzes?.length || 0} quizzes • {video.duration ? `${Math.floor(video.duration / 60)}m` : 'N/A'}
                            </div>
                          </div>
                          
                          {/* Connecting Arrow (except for last) */}
                          {!isLast && (
                            <div className="absolute right-0 translate-x-full w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
                          )}
                        </div>
                        
                        {/* Video Info Below Node */}
                        <div className="mt-3 text-center max-w-[100px]">
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {video.videoTitle || `Video ${video.order + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                            <span className="flex items-center">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 5v2h6V5h2v2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2V5h2m0 4H5v10h14V9h-4v2h-2V9H9z" />
                              </svg>
                              #{video.order + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Timeline Progress Bar (Optional) */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Video Progress</span>
                  <span>{existingVideos.length} total</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Existing Videos Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Existing Video Series</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {existingVideos.length} videos
          </span>
        </div>

        {loadingExisting ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : existingVideos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <div className="text-gray-400 text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">No videos yet</h3>
            <p className="text-gray-500">Start by adding your first video series below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {existingVideos.map((video, index) => {
              const videoId = getVideoIdString(video._id);
              
              return (
                <div key={videoId || index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="relative h-48 bg-gray-900">
                    {video.videoUrl ? (
                      <img
                        src={`${video.videoUrl.replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')}`}
                        alt={video.videoTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/400x200/4F46E5/FFFFFF?text=Video+Thumbnail";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
                        <span className="text-white text-4xl">🎥</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-2 truncate">
                      {video.videoTitle || `Video ${index + 1}`}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <span className="mr-1">❓</span>
                          {video.quizzes?.length || 0} quizzes
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">#</span>
                          Order: {video.order + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteVideo(video._id, video.videoTitle)}
                        disabled={deletingVideoId === videoId || !videoId}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                          deletingVideoId === videoId || !videoId
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500'
                        }`}
                        title={!videoId ? "Video ID is missing" : "Delete video and remove from Cloudinary"}
                      >
                        {deletingVideoId === videoId ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                    {videoId && (
                      <div className="mt-2 text-xs text-gray-500 truncate">
                        ID: {videoId.substring(0, 12)}...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add New Videos Section */}
      <section className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Add New Video Series</h2>
        
        {/* Video Count Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How many videos do you want to add?
          </label>
          <div className="flex items-center space-x-4">
            <select
              value={videoCount}
              onChange={(e) => setVideoCount(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num} video{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <span className="text-gray-500">
              {videos.filter(v => v.file).length} / {videoCount} files selected
            </span>
          </div>
        </div>

        {/* Video Inputs */}
        <div className="space-y-6 mb-8">
          {videos.map((video, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  Video {index + 1}
                </h3>
                <button
                  onClick={() => openQuizModal(index)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    video.quizzes.length > 0
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {video.quizzes.length > 0 ? `Quizzes (${video.quizzes.length})` : 'Add Quizzes'}
                </button>
              </div>

              {/* Video Title */}
              <div className="mb-4">
                <input
                  type="text"
                  value={video.title}
                  onChange={(e) => handleVideoChange(index, 'title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title..."
                />
              </div>

              {/* File Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleVideoChange(index, 'file', file);
                        handleVideoChange(index, 'preview', URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {video.file && (
                    <span className="text-sm text-gray-600">
                      {(video.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </div>
                {video.file && video.file.size > 80 * 1024 * 1024 && (
                  <div className="mt-2 text-amber-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    Large file detected. Upload may take longer on free plan.
                  </div>
                )}
              </div>

              {/* Video Preview */}
              {video.preview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <video
                    src={video.preview}
                    controls
                    className="w-full rounded-lg border border-gray-300 max-h-64"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveAllVideos}
            disabled={saving || videos.some(v => !v.title || !v.file)}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              saving || videos.some(v => !v.title || !v.file)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading Videos...
              </span>
            ) : (
              `Save All ${videoCount} Video${videoCount > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </section>

      {/* Quiz Modal */}
      {renderQuizModal()}
    </div>
  );
};

export default VideoSeries;