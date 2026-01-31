import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
    phoneNumber: {
       type: String,
       default: "",
     },
    password: {
      type: String,
      required: true,
    },
    coursesPaid: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    stripeCustomerId: { type: String, default: "" },
    payments: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        amount: Number,
        date: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "paid", "failed"],
          default: "pending",
        },
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
