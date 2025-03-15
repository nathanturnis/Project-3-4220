console.log('Server starting...');
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = 3000;

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

// // Upload photo API
// app.post('/upload', upload.single('photo'), async (req, res) => {
//     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

//     const fileName = `${Date.now()}-${req.file.originalname}`;
//     const file = bucket.file(fileName);

//     const stream = file.createWriteStream({
//         metadata: { contentType: req.file.mimetype },
//     });

//     stream.on('error', (err) => res.status(500).json({ error: err.message }));

//     stream.on('finish', async () => {
//         await file.makePublic();
//         const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

//         // Save to Cloud SQL
//         await db.query('INSERT INTO photos (name, url) VALUES (?, ?)', [fileName, publicUrl]);

//         res.json({ name: fileName, url: publicUrl });
//     });

//     stream.end(req.file.buffer);
// });

// Fetch all photos API
app.get('/photos', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM gallery');
    res.json(rows);
});

app.listen(port, () => console.log(`Server running on port ${port}`));
