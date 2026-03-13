const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load biến môi trường
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middleware parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notebooks', require('./routes/notebookRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Serve frontend cho tất cả routes khác
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kết nối DB và khởi động server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
});
