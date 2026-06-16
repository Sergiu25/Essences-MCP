import express from 'express';
import cors from 'cors';
import { handleUserQuery } from './llmService.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const response = await handleUserQuery(message);
        res.json(response);
    } catch (err) {
        console.error("Error handling chat request:", err.message);
        res.status(500).json({ error: "Internal server error handling chat.", answer: "Sorry, I experienced a critical error while processing your request." });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`MCP Client running on port ${PORT}`));
