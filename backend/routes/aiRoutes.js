const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/', verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: `You are an AI investment assistant for NexGen Invest. You give brief, helpful financial guidance and answer user queries about their portfolio or the platform's starter, standard, and premium plans. Keep your answers concise, no more than exactly 3-4 short lines. \nUser: ${message}`
        });
        
        res.status(200).json({ reply: response.text });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ reply: "Sorry! The AI Investment Advisor is currently analyzing the market. Please try again later." });
    }
});

module.exports = router;
