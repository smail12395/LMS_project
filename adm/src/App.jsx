import React from 'react'
import { Route, Routes } from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import AddInstructor from './pages/admin/AddInstructor';
import AddCourse from './pages/instructor/AddCourse';

const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <hr />
      <Routes>
        <Route path='/login' element={<Login />} />
      </Routes>
    </div>
  )
}

export default App