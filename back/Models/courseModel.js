import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  contentType: {
    type: String,
    enum: ["postText", "image", "video", "pdf"],
    required: true,
  },
  contentData: {
    type: String, // Cloudinary URL OR text
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  position: {
    type: Number,
    default: 0, // for ordering later
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    imageCover: { type: String, required: true },
    description: { type: String, required: true },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },

    numberOfUsersPaidForThisCourse: {
      type: Number,
      default: 0,
    },

    price: { type: Number, required: true },

    content: [contentSchema], // ✅ NEW

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
