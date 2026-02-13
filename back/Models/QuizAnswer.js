// models/QuizAnswer.js
import mongoose from "mongoose";

const shotSchema = new mongoose.Schema({
  isCorrect: {
    type: Boolean,
    required: true
  },
  duration: {
    type: Number,    // seconds (or milliseconds) spent on this shot
    required: true
  },
  selectedOption: {
    type: Number,    // index of the chosen option (0-based)
    required: true
  }
}, { _id: false }); // no need for subdocument IDs

const quizAnswerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId, // references the quiz subdocument's _id inside the course
    required: true,
    index: true
  },
  // Snapshot of the quiz question/options/points at the time of first attempt
  quizSnapshot: {
    question: String,
    options: [String],
    pointsPossible: Number
  },
  firstShot: {
    type: shotSchema,
    required: true   // first shot is always present when document is created
  },
  secondShot: {
    type: shotSchema,
    required: false  // second shot may be null if not taken
  },
  totalPointsEarned: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
// models/QuizAnswer.js
quizAnswerSchema.pre('save', function(next) {
  const possiblePoints = this.quizSnapshot?.pointsPossible || 0;
  const MAX_TIME_FIRST = 30;   // seconds – after this, no points on first shot
  const MAX_TIME_SECOND = 20;  // seconds – after this, no points on second shot
  const FULL_POINTS_TIME = 7;   // seconds – answer within this gets max points for that shot

  // Helper to compute points for a given shot
  const computePoints = (shot, maxPossible, maxTime) => {
    if (!shot || !shot.isCorrect) return 0;
    const dur = shot.duration;
    if (dur <= FULL_POINTS_TIME) return maxPossible;
    if (dur >= maxTime) return 0;
    // Linear decay
    return maxPossible * (1 - (dur - FULL_POINTS_TIME) / (maxTime - FULL_POINTS_TIME));
  };

  let earned = 0;
  let anyCorrect = false;

  if (this.firstShot && this.firstShot.isCorrect) {
    // First shot correct
    earned = computePoints(this.firstShot, possiblePoints, MAX_TIME_FIRST);
    anyCorrect = true;
  } else if (this.secondShot && this.secondShot.isCorrect) {
    // First shot wrong, second shot correct
    const maxSecond = possiblePoints * 0.5;
    earned = computePoints(this.secondShot, maxSecond, MAX_TIME_SECOND);
    anyCorrect = true;
  }
  // If both shots are wrong or missing, earned stays 0

  this.totalPointsEarned = Math.max(0, Math.min(possiblePoints, earned)); // clamp between 0 and possiblePoints
  this.passed = anyCorrect;

  next();
});

export default mongoose.model("QuizAnswer", quizAnswerSchema);
