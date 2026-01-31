import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected',()=>{console.log("DB connecteed")})
    await mongoose.connect(`${process.env.DB_URL}/LMS`)
}

export default connectDB;