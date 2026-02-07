import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import AddCource from './pages/instructor/AddCource';
import AllCources from './pages/instructor/AllCources';
import DashInstructor from './pages/instructor/DashInstructor';

const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      
      <hr />
      <ToastContainer />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/AddCource' element={<AddCource />} />
        <Route path='/AllCources' element={<AllCources />} />
        <Route path='/' element={<DashInstructor />} />
      </Routes>
    </div>
  )
}

export default App