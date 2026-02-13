import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongoDB.js";
import connectCloudinary from "./config/cloudinary.js";

import userRoute from "./routes/userRouters.js";
import instructorRoute from "./routes/instructorRouters.js";
import adminRouter from "./routes/adminRouters.js";

const app = express();
const port = process.env.PORT || 4000;

connectDB();
connectCloudinary();

//  CORS (Express 5 compatible)
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);


// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/user", userRoute);
app.use("/api/instructor", instructorRoute);
app.use("/api/admin", adminRouter);



app.get("/", (req, res) => {
  res.send("Working");
});

export default app;
