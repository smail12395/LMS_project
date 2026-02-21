import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Home from './pages/Home';
import Pay from './pages/Pay';
import Course from './pages/Course';
import MyCourses from './pages/MyCourses';
import MyProfile from './pages/MyProfile';
import Navbar from './components/Navbar'; 

const App = () => {
  return (
    <div>
      <Navbar /> 
      <div className='mx-4 sm:mx-[10%]'>
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