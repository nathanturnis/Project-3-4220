console.log('Server starting...');
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

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
});

// Multer setup for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });


// Fetch all photos API
app.get('/photos', async (req, res) => {
    try {
        // Step 1: Query the database to get all photos
        const [rows] = await db.execute('SELECT * FROM gallery');

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No photos found' });
        }

        // Step 2: Generate signed URLs for each photo
        const photosWithSignedUrls = [];

        for (const photo of rows) {
            const file = bucket.file(photo.link);  // `photo.link` stores the object path (e.g., `1710513278123-uuid-image.jpg`)

            const options = {
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // URL valid for 1 hour
            };

            const [signedUrl] = await file.getSignedUrl(options);

            // Add the signed URL to the photo object
            photosWithSignedUrls.push({
                id: photo.id,
                user_id: photo.user_id,
                photo_name: photo.photo_name,
                link: signedUrl, // Store the signed URL in the response
                created_dt: photo.created_dt,
                modified_dt: photo.modified_dt,
            });
        }

        // Step 3: Send the response with all photos and signed URLs
        res.json(photosWithSignedUrls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/photos', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!req.body.photo_name) return res.status(400).json({ error: 'Photo name is required' });

        const userFriendlyName = req.body.photo_name;
        const uniqueFileName = `${Date.now()}-${uuidv4()}-${req.file.originalname}`;
        const file = bucket.file(uniqueFileName);

        // Upload file to Google Cloud Storage (Private)
        const stream = file.createWriteStream({
            metadata: { contentType: req.file.mimetype },
        });

        stream.on('error', (err) => res.status(500).json({ error: err.message }));

        stream.on('finish', async () => {
            // File is private, store the object path instead of the signed URL
            const objectPath = uniqueFileName;

            // Insert metadata into Cloud SQL with the object path
            const createdDt = new Date();
            const modifiedDt = createdDt;
            const userId = 1234; // Hardcoded user ID
            const id = uuidv4();

            const sql = `
                INSERT INTO gallery (id, user_id, photo_name, link, created_dt, modified_dt)
                VALUES (?, ?, ?, ?, ?, ?)`;

            await db.execute(sql, [id, userId, userFriendlyName, objectPath, createdDt, modifiedDt]);

            res.json({ message: 'Photo uploaded', photoName: userFriendlyName });
        });

        stream.end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/photos/search', async (req, res) => {
    try {
        const { query } = req.query;  // Get the search query from the query string
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // SQL query to search photos by name (using LIKE for partial matching and LOWER for case-insensitivity)
        const sql = `
            SELECT id, user_id, photo_name, link, created_dt, modified_dt
            FROM gallery
            WHERE LOWER(photo_name) LIKE LOWER(?)`;  // Use LOWER() to make both sides case-insensitive

        const [rows] = await db.execute(sql, [`%${query}%`]);  // Execute the query with LIKE search

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No photos found' });
        }

        // Array to store the photos with signed URLs
        const photosWithSignedUrls = [];

        // Iterate over the rows to generate signed URLs for each photo
        for (const photo of rows) {
            const file = bucket.file(photo.link);  // `photo.link` stores the object path (e.g., `1710513278123-uuid-image.jpg`)

            // Define options for generating the signed URL
            const options = {
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // URL valid for 1 hour
            };

            // Generate the signed URL
            const [signedUrl] = await file.getSignedUrl(options);

            // Push the photo object with the signed URL to the result array
            photosWithSignedUrls.push({
                id: photo.id,
                user_id: photo.user_id,
                photo_name: photo.photo_name,
                link: signedUrl, // Store the signed URL in the response
                created_dt: photo.created_dt,
                modified_dt: photo.modified_dt,
            });
        }

        // Send the photos with signed URLs as a response
        res.json(photosWithSignedUrls);
    } catch (error) {
        console.error('Error searching for photos:', error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, () => console.log(`Server running on port ${port}`));
