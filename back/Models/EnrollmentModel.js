import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Default to 1 year from enrollment
        const oneYear = new Date(this.enrolledAt);
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        return oneYear;
      },
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'refunded'],
      default: 'active',
    },
    paymentId: {
      type: String,
    },
    amountPaid: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'usd',
    },
  },
  { timestamps: true }
);

// Prevent duplicate enrollments
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Index for fast status/expiration queries
enrollmentSchema.index({ status: 1, expiresAt: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;