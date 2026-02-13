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
    default: 0,
  },
  // ✅ NEW FIELD: Content Availability
  availability: {
    type: String,
    enum: ["paid", "free"], // "paid" = only for paying users, "free" = everyone can see
    default: "paid",
    required: true,
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
    videoSeries: [
      {
        videoTitle: { type: String, required: true },
        videoUrl: { type: String, required: true },
        cloudinaryPublicId: { type: String, required: true },
        duration: { type: Number },
        quizzes: [
          {
            question: String,
            options: [String],
            correctAnswer: Number,
            points: { type: Number, default: 10 },
          },
        ],
        order: { type: Number },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    price: { type: Number, required: true },

    content: [contentSchema],

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);