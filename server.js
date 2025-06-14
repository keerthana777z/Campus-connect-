const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/campusconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Load models
const Note = require('./models/Note');
const User = require('./models/User');

// Middleware
app.use(cors());  // allow all CORS requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage config for note uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth: Signup
app.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Check for existing user
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();
    // Respond with user data (excluding password)
    const userResponse = { id: newUser._id, name: newUser.name, email: newUser.email };
    res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  try {
    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    // Respond with user data (excluding password)
    const userResponse = { id: user._id, name: user.name, email: user.email };
    res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload Notes to DB
app.post('/upload-notes', upload.single('file'), async (req, res) => {
  const { subject } = req.body;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  try {
    const note = new Note({
      subject,
      filename: file.originalname,
      url: `http://localhost:3000/uploads/${file.filename}`
    });
    await note.save();
    res.status(200).json({
      message: '✅ File uploaded successfully!',
      filename: note.filename,
      subject: note.subject,
      url: note.url
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all notes from DB
app.get('/get-uploaded-notes', async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Search notes by subject
app.get('/search-notes', async (req, res) => {
  const { subject } = req.query;
  try {
    const notes = await Note.find({
      subject: { $regex: subject, $options: 'i' }
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Health check
app.get('/', (req, res) => res.send('✅ Backend is running!'));

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
