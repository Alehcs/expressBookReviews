const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Opcional: para permitir CORS
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos
const app = express();
const port = 8080; // Se cambió el puerto a 8080

// Middleware
app.use(express.json());
app.use(cors()); // Habilitar CORS (opcional)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Se recomienda usar variables de entorno
  resave: false,
  saveUninitialized: true,
}));

// Mock database (replace with actual database in production)
const books = [
  { isbn: '123456', title: 'Sample Book 1', author: 'Author 1' },
  { isbn: '789012', title: 'Sample Book 2', author: 'Author 2' },
];
const users = [];
const reviews = [];

// Helper function to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Routes
app.get('/books', (req, res) => {
  res.json(books);
});

app.get('/books/isbn/:isbn', (req, res) => {
  const book = books.find(b => b.isbn === req.params.isbn);
  if (book) {
    res.json(book);
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
});

app.get('/books/author/:author', (req, res) => {
  const filteredBooks = books.filter(b => b.author.toLowerCase().includes(req.params.author.toLowerCase()));
  res.json(filteredBooks);
});

app.get('/books/title/:title', (req, res) => {
  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(req.params.title.toLowerCase()));
  res.json(filteredBooks);
});

app.get('/reviews/:isbn', (req, res) => {
  const bookReviews = reviews.filter(r => r.isbn === req.params.isbn);
  res.json(bookReviews);
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = username;
    const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-jwt-secret', { expiresIn: '1h' }); // Se recomienda usar variables de entorno
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/reviews', isLoggedIn, (req, res) => {
  const { isbn, text } = req.body;
  const newReview = { id: uuidv4(), isbn, text, username: req.session.user };
  reviews.push(newReview);
  res.status(201).json(newReview);
});

app.put('/reviews/:id', isLoggedIn, (req, res) => {
  const reviewId = req.params.id;
  const reviewIndex = reviews.findIndex(r => r.id === reviewId && r.username === req.session.user);
  if (reviewIndex !== -1) {
    reviews[reviewIndex] = { ...reviews[reviewIndex], ...req.body };
    res.json(reviews[reviewIndex]);
  } else {
    res.status(404).json({ message: 'Review not found or unauthorized' });
  }
});

app.delete('/reviews/:id', isLoggedIn, (req, res) => {
  const reviewId = req.params.id;
  const reviewIndex = reviews.findIndex(r => r.id === reviewId && r.username === req.session.user);
  if (reviewIndex !== -1) {
    reviews.splice(reviewIndex, 1);
    res.json({ message: 'Review deleted successfully' });
  } else {
    res.status(404).json({ message: 'Review not found or unauthorized' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
