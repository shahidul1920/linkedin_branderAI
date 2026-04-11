import express from 'express';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Crucial for React to talk to this API on a different port

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const profileData = JSON.parse(fs.readFileSync('./myProfile.json', 'utf8'));

// Initialize the model with Search Grounding
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }] 
});

// The Dual-Persona System Instructions
const systemInstructions = `
You are the Digital Twin Agent for Shahidul Shakil.
IDENTITY: ${JSON.stringify(profileData.identity)}
PILLARS: ${JSON.stringify(profileData.contentPillars)}
TONE: ${JSON.stringify(profileData.toneRules)}

STRATEGY:
1. Act as a Strategist: If Shahidul gives a raw, vague idea, push back. Ask him to clarify which of his content pillars it fits into or suggest a better angle.
2. Act as a Copywriter: When asked to draft, use his exact tone. Zero corporate fluff.
3. Use Search Grounding to pull live data if the topic involves current tech trends, framework updates, or industry news.
`;

// Initialize the persistent chat session
let chatSession = model.startChat({
    history: [{ role: "user", parts: [{ text: systemInstructions }] }],
});

// The API Endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        console.log(`Processing user prompt: "${userMessage}"`);
        const result = await chatSession.sendMessage(userMessage);
        
        res.json({ 
            reply: result.response.text(),
            status: "success"
        });

    } catch (error) {
        console.error("Agent Error:", error);
        res.status(500).json({ error: "The agent encountered an error processing your request." });
    }
});

// Reset endpoint (useful if the agent gets stuck in a loop and you want to clear memory)
app.post('/api/reset', (req, res) => {
    chatSession = model.startChat({
        history: [{ role: "user", parts: [{ text: systemInstructions }] }],
    });
    res.json({ message: "Agent memory wiped. Ready for a new topic." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🧠 Agent Backend running on port ${PORT}`);
});