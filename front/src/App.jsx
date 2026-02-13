import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Home from './pages/Home';
import Pay from './pages/Pay';
import Course from './pages/Course';

const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <ToastContainer />
      <hr />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<Home />} />
        <Route path='/pay/:courseId' element={<Pay />} />
        <Route path='/course/:courseId' element={<Course />} />
      </Routes>
    </div>
  )
}

export default App