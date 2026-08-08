const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: [
      {
        type: String,
        required: true,
        trim: true
      }
    ],
    correctOptionIndex: {
      type: Number,
      required: true,
      select: false // Never selected by default in standard queries
    },
    explanation: {
      type: String,
      required: true,
      select: false // Never selected by default in standard queries
    }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    dateIndex: {
      type: Date,
      unique: true,
      sparse: true, // Ensured unique for daily assignment
      index: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    questions: [questionSchema],
    isDemoData: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Quiz', quizSchema);