const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Opcional: para permitir CORS
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos
const app = express();
const port = 8080; // Puerto 8080

// Middleware
app.use(express.json());
app.use(cors()); // Habilitar CORS (opcional)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Usar variables de entorno en producción
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

// Callback function example: delete a book
const deleteBookCallback = (isbn, callback) => {
  setTimeout(() => {
    const index = books.findIndex(b => b.isbn === isbn);
    if (index !== -1) {
      const deletedBook = books.splice(index, 1);
      callback(null, deletedBook[0]);
    } else {
      callback(new Error('Book not found'), null);
    }
  }, 1000); // Simulación de una operación asíncrona
};

// Routes

// GET all books
app.get('/books', (req, res) => {
  res.json(books);
});

// DELETE a book using a callback
app.delete('/books/isbn/:isbn', (req, res) => {
  const isbn = req.params.isbn;
  deleteBookCallback(isbn, (err, deletedBook) => {
    if (err) {
      res.status(404).json({ message: err.message });
    } else {
      res.json({ message: 'Book deleted successfully', book: deletedBook });
    }
  });
});

// GET book by ISBN
app.get('/books/isbn/:isbn', (req, res) => {
  const book = books.find(b => b.isbn === req.params.isbn);
  if (book) {
    res.json(book);
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
});

// GET books by author
app.get('/books/author/:author', (req, res) => {
  const filteredBooks = books.filter(b => b.author.toLowerCase().includes(req.params.author.toLowerCase()));
  res.json(filteredBooks);
});

// GET books by title
app.get('/books/title/:title', (req, res) => {
  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(req.params.title.toLowerCase()));
  res.json(filteredBooks);
});

// GET reviews by ISBN
app.get('/reviews/:isbn', (req, res) => {
  const bookReviews = reviews.filter(r => r.isbn === req.params.isbn);
  res.json(bookReviews);
});

// PROMISES EXAMPLE: Register a user
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  new Promise((resolve, reject) => {
    if (users.find(u => u.username === username)) {
      reject(new Error('Username already exists'));
    } else {
      bcrypt.hash(password, 10)
        .then(hashedPassword => {
          users.push({ username, password: hashedPassword });
          resolve('User registered successfully');
        })
        .catch(err => reject(err));
    }
  })
  .then(message => res.status(201).json({ message }))
  .catch(err => res.status(400).json({ message: err.message }));
});

// PROMISES EXAMPLE: Login a user
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  new Promise((resolve, reject) => {
    const user = users.find(u => u.username === username);
    if (!user) return reject(new Error('Invalid credentials'));
    
    bcrypt.compare(password, user.password)
      .then(isMatch => {
        if (isMatch) {
          req.session.user = username;
          const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-jwt-secret', { expiresIn: '1h' });
          resolve({ message: 'Logged in successfully', token });
        } else {
          reject(new Error('Invalid credentials'));
        }
      })
      .catch(err => reject(err));
  })
  .then(response => res.json(response))
  .catch(err => res.status(401).json({ message: err.message }));
});

// POST a review (Promise-based)
app.post('/reviews', isLoggedIn, (req, res) => {
  const { isbn, text } = req.body;

  new Promise((resolve, reject) => {
    if (!isbn || !text) {
      reject(new Error('Missing required fields'));
    } else {
      const newReview = { id: uuidv4(), isbn, text, username: req.session.user };
      reviews.push(newReview);
      resolve(newReview);
    }
  })
  .then(newReview => res.status(201).json(newReview))
  .catch(err => res.status(400).json({ message: err.message }));
});

// PUT a review
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

// DELETE a review
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
