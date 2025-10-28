const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const {FRONTEND_URL} = require('./config/urls');

require('dotenv').config();

const app = express();

connectDB();

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
