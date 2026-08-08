import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Home from './pages/Home';
import Pay from './pages/Pay';
import Course from './pages/Course';
import MyCourses from './pages/MyCourses';
import MyProfile from './pages/MyProfile';
import Navbar from './components/Navbar'; 
import { isPreviewMode } from './services/dataMode';

const App = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div>
      {isPreviewMode && (
        <div className="bg-emerald-600 text-white text-center text-xs font-medium py-1.5 px-4 tracking-wide">
          Preview Mode — data loaded from local preview-data files, no backend calls
        </div>
      )}
      <Navbar /> 
      <div className={isHome ? '' : 'mx-4 sm:mx-[10%]'}>
        <ToastContainer />
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/' element={<Home />} />
          <Route path='/pay/:courseId' element={<Pay />} />
          <Route path='/course/:courseId' element={<Course />} />
          <Route path='/MyCourses' element={<MyCourses />} />
          <Route path='/MyProfile' element={<MyProfile />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;