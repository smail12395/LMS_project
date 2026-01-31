import express from 'express'
import cors from  'cors'
import 'dotenv/config'
import connectDB from './config/mongoDb.js'
import connectCloudinary from './config/cloudinary.js'
import userRoute from './routes/userRouters.js'
import instructorRoute from './routes/instructorRouters.js'
import adminRouter from './routes/adminRouters.js'

//app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

//middlewares
app.use(express.json())
app.use(cors())

//API endpoints
app.use('/api/user', userRoute)
app.use('/api/instructor', instructorRoute)
app.use('/api/admin', adminRouter)


app.get('/', (req,res)=>{
    res.send("Woorking")

})

app.listen(port,() =>{
    console.log('lestining at', port)
})