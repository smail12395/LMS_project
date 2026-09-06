import React, { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Home from './pages/Home';
import Pay from './pages/Pay';
import Course from './pages/Course';
import MyCourses from './pages/MyCourses';
import MyProfile from './pages/MyProfile';
import Navbar from './components/Navbar'; 
import { isPreviewMode } from './services/dataMode';
import { useTranslation } from 'react-i18next';
import { setTourNavigator, subscribeTour } from './services/previewTourController';

const App = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    setTourNavigator(navigate);
  }, [navigate]);

  useEffect(() => {
    const unsub = subscribeTour((s) => {
      if (s.stored === 'completed') toast.success(t('tour.completed'));
    });
    return unsub;
  }, [t]);

  return (
    <div>
      {isPreviewMode && (
        <div className="bg-emerald-600 text-white text-center text-xs font-medium py-1.5 px-4 tracking-wide">
          {t('app.previewBanner')}
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