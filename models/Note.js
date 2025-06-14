// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  filename: { type: String, required: true },
  url: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
