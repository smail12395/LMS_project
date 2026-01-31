import mongoose from "mongoose";

const instructorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  speciality: {
    type: String,
    required: true,
    trim: true,
  },
  stripePublicKey: {
    type: String,
    required: true,
  },
  stripeSecretKey: {
    type: String,
    required: true,
  },
  // لتخزين الكورسات التي أنشأها المدرس
  courses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    }
  ]
}, { timestamps: true });

export default mongoose.model("Instructor", instructorSchema);
