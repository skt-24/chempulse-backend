const mongoose = require('mongoose');

const moleculeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Molecule name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Molecule slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    formula: {
      type: String,
      required: [true, 'Chemical formula is required'],
      trim: true
    },
    molarMass: {
      type: Number,
      required: [true, 'Molar mass is required'] // in g/mol
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    structureImage: {
      url: { type: String, default: '' },
      alt: { type: String, default: '' }
    },
    commonUses: [
      {
        type: String,
        trim: true
      }
    ],
    properties: {
      density: String, // e.g., "0.789 g/cm³"
      meltingPoint: String, // e.g., "-114.1 °C"
      boilingPoint: String, // e.g., "78.37 °C"
      appearance: String
    },
    safetyNotes: {
      type: String,
      default: ''
    },
    references: [
      {
        title: String,
        url: String
      }
    ],
    featuredDate: {
      type: Date,
      unique: true,
      sparse: true, // Allows null/missing values while ensuring uniqueness for specific MOTD dates
      index: true
    },
    isDemoData: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Full text search index
moleculeSchema.index({
  name: 'text',
  formula: 'text',
  description: 'text',
  commonUses: 'text'
});

module.exports = mongoose.model('Molecule', moleculeSchema);