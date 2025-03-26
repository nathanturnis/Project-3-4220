console.log('Server starting...');
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../client')));

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
// Google Cloud Storage setup
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);


// Cloud SQL MySQL setup
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
}).promise();

// Multer setup for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Middleware to extract user ID from request
 * Assumes frontend sends `user_id` in the request body (since no auth mechanism exists)
 */
const requireUser = (req, res, next) => {
    const userId = req.body.user_id || req.query.user_id;
    if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
    }
    req.userId = userId;
    next();
};

// Fetch all photos for the logged-in user
app.get('/photos', requireUser, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM gallery WHERE user_id = ?', [req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No photos found' });
        }

        const photosWithSignedUrls = await Promise.all(rows.map(async (photo) => {
            const file = bucket.file(photo.link);
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });

            return {
                id: photo.id,
                user_id: photo.user_id,
                photo_name: photo.photo_name,
                link: signedUrl,
                created_dt: photo.created_dt,
                modified_dt: photo.modified_dt,
            };
        }));

        res.json(photosWithSignedUrls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload a new photo for the logged-in user
app.post('/photos', upload.single('photo'), requireUser, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!req.body.photo_name) return res.status(400).json({ error: 'Photo name is required' });

        const userFriendlyName = req.body.photo_name;
        const uniqueFileName = `${Date.now()}-${uuidv4()}-${req.file.originalname}`;
        const file = bucket.file(uniqueFileName);

        const stream = file.createWriteStream({ metadata: { contentType: req.file.mimetype } });

        stream.on('error', (err) => res.status(500).json({ error: err.message }));

        stream.on('finish', async () => {
            const createdDt = new Date();
            const modifiedDt = createdDt;
            const id = uuidv4();

            await db.execute(
                'INSERT INTO gallery (id, user_id, photo_name, link, created_dt, modified_dt) VALUES (?, ?, ?, ?, ?, ?)',
                [id, req.userId, userFriendlyName, uniqueFileName, createdDt, modifiedDt]
            );

            res.json({ message: 'Photo uploaded', photoName: userFriendlyName });
        });

        stream.end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search photos for the logged-in user
app.get('/photos/search', requireUser, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: 'Search query is required' });

        const [rows] = await db.execute(
            'SELECT id, user_id, photo_name, link, created_dt, modified_dt FROM gallery WHERE user_id = ? AND LOWER(photo_name) LIKE LOWER(?)',
            [req.userId, `%${query}%`]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'No photos found' });

        const photosWithSignedUrls = await Promise.all(rows.map(async (photo) => {
            const file = bucket.file(photo.link);
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000,
            });

            return {
                id: photo.id,
                user_id: photo.user_id,
                photo_name: photo.photo_name,
                link: signedUrl,
                created_dt: photo.created_dt,
                modified_dt: photo.modified_dt,
            };
        }));

        res.json(photosWithSignedUrls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Check if the username already exists
        const [rows] = await db.query('SELECT * FROM user WHERE username = ?', [username]);
        if (rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Insert user into the database with the plain password
        const userId = uuidv4();
        const createdDt = new Date();
        const modifiedDt = createdDt;

        const sql = `
            INSERT INTO user (id, username, password, created_dt, modified_dt)
            VALUES (?, ?, ?, ?, ?)`;
        await db.query(sql, [userId, username, password, createdDt, modifiedDt]);

        res.json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login User
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM user WHERE username = ?', [username]);
        if (rows.length === 0 || rows[0].password !== password) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        res.json({ message: 'Login successful', user_id: rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, () => console.log(`Server running on port ${port}`));
