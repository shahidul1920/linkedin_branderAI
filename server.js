import express from 'express';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Crucial for React to talk to this API on a different port

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const profileData = JSON.parse(fs.readFileSync('./myProfile.json', 'utf8'));

// The Dual-Persona System Instructions
const systemInstructions = `
You are the Digital Twin Agent for Shahidul Shakil, a WordPress & Front-end Developer with 4+ years of experience building visually engaging web experiences.

PROFESSIONAL PROFILE:
- Current Role: Web Developer at Redmun Digitech
- Title: WordPress & Front-end Developer
- Core Skills: React.js, GSAP, Tailwind, Node.js, WordPress, JavaScript, UI/UX Design
- Expertise: Interactive Animations, E-commerce Development, Responsive Design, Adobe Creative Suite
- Background: Tech enthusiast, builds custom PCs, tests local AI models, understands internet culture

NOTABLE PROJECTS:
${profileData.projects.map(p => `- ${p.name}: ${p.highlight}`).join('\n')}

EDUCATION:
${profileData.education.join('\n')}

CONTENT PILLARS:
${profileData.contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}

TONE & STRATEGY:
${profileData.toneRules.join('\n')}

INTERACTION RULES:
1. Act as a Strategist: Push back on vague ideas. Ask which content pillar it fits into or suggest a better angle.
2. Act as a Copywriter: Draft with his exact tone. Zero corporate fluff.
3. Use Search Grounding for current tech trends, framework updates, or industry news.
4. Reference his actual projects and experience when relevant.
`;

// OPTIMIZATION 1: Using latest available Gemini model.
// OPTIMIZATION 2: Native systemInstruction injection for better context awareness.
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Update this if you have a different model available
    systemInstruction: systemInstructions,
    tools: [
        {
            googleSearch: {} // Enables live web search for current data
        }
    ]
});

// Initialize the persistent chat session cleanly
let chatSession = model.startChat({
    history: [], // No longer need to hack system instructions into the history array
});

const extractStatusCode = (error) => {
    return error?.status || error?.statusCode || error?.response?.status || 500;
};

const isTransientModelError = (error) => {
    const status = extractStatusCode(error);
    return status === 429 || status === 503;
};

const sendWithRetry = async (message, maxRetries = 2) => {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await chatSession.sendMessage(message);
        } catch (error) {
            lastError = error;

            if (!isTransientModelError(error) || attempt === maxRetries) {
                throw error;
            }

            const backoffMs = 1000 * (attempt + 1);
            console.warn(`Transient Gemini error. Retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
        }
    }

    throw lastError;
};

// The API Endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        console.log(`Processing user prompt: "${userMessage}"`);
        const result = await sendWithRetry(userMessage);
        
        res.json({ 
            reply: result.response.text(),
            status: "success"
        });

    } catch (error) {
        console.error("Agent Error:", error);
        const status = extractStatusCode(error);

        if (status === 503) {
            return res.status(503).json({
                error: "The AI model is temporarily overloaded. Please try again in a few seconds.",
                code: "MODEL_OVERLOADED"
            });
        }

        if (status === 429) {
            return res.status(429).json({
                error: "Rate limit reached. Please wait a moment and try again.",
                code: "RATE_LIMITED"
            });
        }

        res.status(500).json({
            error: "The agent encountered an error processing your request.",
            code: "AGENT_ERROR"
        });
    }
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
    chatSession = model.startChat({
        history: [], 
    });
    res.json({ message: "Agent memory wiped. Ready for a new topic." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🧠 Agent Backend running on port ${PORT}`);
});