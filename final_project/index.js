const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const axios = require('axios');

const app = express();
const PORT = 5000;
const JWT_SECRET = "your_jwt_secret"; // En una aplicación real, usa una variable de entorno

app.use(express.json());
app.use("/customer", session({secret:"fingerprint_customer", resave: true, saveUninitialized: true}));

let books = {
    1: {"author": "Chinua Achebe", "title": "Things Fall Apart", "reviews": {}},
    2: {"author": "Hans Christian Andersen", "title": "Fairy tales", "reviews": {}},
    3: {"author": "Dante Alighieri", "title": "The Divine Comedy", "reviews": {}},
    4: {"author": "Unknown", "title": "The Epic Of Gilgamesh", "reviews": {}},
    5: {"author": "Unknown", "title": "The Book Of Job", "reviews": {}},
    6: {"author": "Unknown", "title": "One Thousand and One Nights", "reviews": {}},
    7: {"author": "Unknown", "title": "Nj\u00e1l's Saga", "reviews": {}},
    8: {"author": "Jane Austen", "title": "Pride and Prejudice", "reviews": {}},
    9: {"author": "Honor\u00e9 de Balzac", "title": "Le P\u00e8re Goriot", "reviews": {}},
    10: {"author": "Samuel Beckett", "title": "Molloy, Malone Dies, The Unnamable, the trilogy", "reviews": {}}
};

let users = {};

// Middleware para verificar si el usuario está logueado
const isLoggedIn = (req, res, next) => {
    if (req.session.authorization) {
        const token = req.session.authorization['accessToken'];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
                next();
            } else {
                return res.status(403).json({ message: "Usuario no autenticado" });
            }
        });
    } else {
        return res.status(403).json({ message: "Usuario no logueado" });
    }
};

// Task 1 & 10: Get the book list available in the shop
app.get('/', async (req, res) => {
    try {
        res.send(JSON.stringify(books, null, 4));
    } catch (error) {
        res.status(500).send('Error retrieving books');
    }
});

// Task 2 & 11: Get book details based on ISBN
app.get('/isbn/:isbn', async (req, res) => {
    try {
        const isbn = req.params.isbn;
        const book = books[isbn];
        if (book) {
            res.send(JSON.stringify(book, null, 4));
        } else {
            res.status(404).send('Book not found');
        }
    } catch (error) {
        res.status(500).send('Error retrieving book details');
    }
});

// Task 3 & 12: Get book details based on author
app.get('/author/:author', async (req, res) => {
    try {
        const author = req.params.author;
        const booksByAuthor = Object.values(books).filter(book => book.author === author);
        if (booksByAuthor.length > 0) {
            res.send(JSON.stringify(booksByAuthor, null, 4));
        } else {
            res.status(404).send('No books found for this author');
        }
    } catch (error) {
        res.status(500).send('Error retrieving books by author');
    }
});

// Task 4 & 13: Get all books based on title
app.get('/title/:title', async (req, res) => {
    try {
        const title = req.params.title.toLowerCase();
        const matchingBooks = Object.values(books).filter(book => 
            book.title.toLowerCase().includes(title)
        );
        if (matchingBooks.length > 0) {
            res.send(JSON.stringify(matchingBooks, null, 4));
        } else {
            res.status(404).send('No books found with this title');
        }
    } catch (error) {
        res.status(500).send('Error retrieving books by title');
    }
});

// Task 5: Get book review
app.get('/review/:isbn', (req, res) => {
    const isbn = req.params.isbn;
    const book = books[isbn];
    if (book && book.reviews) {
        res.send(JSON.stringify(book.reviews, null, 4));
    } else {
        res.status(404).send('No reviews found for this book');
    }
});

// Task 6: Register new user
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    if (users[username]) {
        return res.status(409).send("Username already exists");
    }

    users[username] = { username, password };
    return res.status(201).send("User registered successfully");
});

// Task 7: Login as a registered user
app.post("/customer/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    const user = users[username];
    if (user && user.password === password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        req.session.authorization = { accessToken: token };
        return res.status(200).json({ message: "Login successful", token });
    } else {
        return res.status(401).json({ message: "Invalid credentials" });
    }
});

// Task 8: Add or modify a book review
app.put("/customer/auth/review/:isbn", isLoggedIn, (req, res) => {
    const isbn = req.params.isbn;
    const review = req.query.review;
    const username = req.user.username;

    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }

    if (!review) {
        return res.status(400).json({ message: "Review text is required" });
    }

    if (!books[isbn].reviews) {
        books[isbn].reviews = {};
    }

    books[isbn].reviews[username] = review;

    return res.status(200).json({ message: "Review added/modified successfully" });
});

// Task 9: Delete a book review
app.delete("/customer/auth/review/:isbn", isLoggedIn, (req, res) => {
    const isbn = req.params.isbn;
    const username = req.user.username;

    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }

    if (!books[isbn].reviews || !books[isbn].reviews[username]) {
        return res.status(404).json({ message: "No review found for this user" });
    }

    delete books[isbn].reviews[username];

    return res.status(200).json({ message: "Review deleted successfully" });
});

app.listen(PORT, () => console.log("Server is running"));
