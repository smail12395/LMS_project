import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import AddCource from './pages/instructor/AddCource';
import AllCources from './pages/instructor/AllCources';
import DashInstructor from './pages/instructor/DashInstructor';
import CourseDetails from './pages/instructor/CourseDetails';
import Navbar from './components/Navbar';
import VideoSeries from './pages/instructor/VideoSeries';
import UsersAnswers from './pages/instructor/UsersAnswers';
import ManageInstructors from './pages/admin/ManageInstructors';
import { isPreviewMode } from './services/dataMode';

const App = () => {
  return (
    <>
      {isPreviewMode && (
        <div className="bg-emerald-600 text-white text-center text-xs font-medium py-1.5 px-4 tracking-wide">
          Preview Mode — data loaded from local preview-data files, no backend calls
        </div>
      )}
      <Navbar />

      <div className="mx-4 sm:mx-[10%]">
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/AddCource" element={<AddCource />} />
          <Route path="/AllCources" element={<AllCources />} />
          <Route path="/" element={<DashInstructor />} />
          <Route path="/AllCources/:courseId" element={<CourseDetails />} />
          <Route path="/VideoSeries/:courseId" element={<VideoSeries />} />
          <Route path="/UsersAnswers/:courseId" element={<UsersAnswers />} />
          <Route path="/ManageInstructors" element={<ManageInstructors />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
