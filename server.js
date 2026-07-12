require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).send(`
        <div style="display:flex; height:100vh; width:100%; justify-content:center; align-items:center; font-family:sans-serif; background-color:#F8FAFC;">
            <div style="text-align:center; padding:40px; background:#fff; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-top:4px solid #002D62;">
                <h1 style="color:#002D62; margin-bottom:10px;">404 - Not Found</h1>
                <p style="color:#64748B;">The requested resource was not found on this server.</p>
                <a href="/" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#002D62; color:#fff; text-decoration:none; border-radius:4px;">Return to Portal</a>
            </div>
        </div>
    `);
});

app.listen(PORT, () => {
    console.log(`Server initialized and running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});