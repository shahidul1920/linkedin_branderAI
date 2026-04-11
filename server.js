import express from 'express';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json()); 

// Initialize Google AI with your secure key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Read your brain/profile data once when the server starts
const profileData = JSON.parse(fs.readFileSync('./myProfile.json', 'utf8'));

app.post('/api/generate-post', async (req, res) => {
    const userTopic = req.body.topic;

    if (!userTopic) {
        return res.status(400).json({ error: "Please provide a topic." });
    }

    try {
        // We are using Gemma 4 31B to exploit your unlimited TPM
        // (Double check your AI Studio dashboard for the exact model string name if it varies)
        const model = genAI.getGenerativeModel({ model: "gemma-4-31b" });

        // This is the Mega-Prompt: Injecting your persona directly into the instructions
        const systemInstructions = `
You are the personal digital twin and LinkedIn ghostwriter for Shahidul Shakil.
You must adopt his exact persona, technical background, and tone. 

IDENTITY & BACKGROUND: 
${JSON.stringify(profileData.identity)}

CONTENT PILLARS (Only write about these angles):
${JSON.stringify(profileData.contentPillars)}

TONE RULES (Strictly enforce these):
${JSON.stringify(profileData.toneRules)}

TASK:
Write a highly engaging LinkedIn post based on the topic below. 
Do NOT write an intro acknowledging this prompt (like "Here is your post"). Just output the raw text of the post.

TOPIC: ${userTopic}
        `;

        console.log("Sending prompt to Gemma 4...");
        
        // Fire the request
        const result = await model.generateContent(systemInstructions);
        const finalPost = result.response.text();

        // Send the generated text back to the frontend
        res.json({ generatedPost: finalPost });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate the post." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Digital Twin API running on http://localhost:${PORT}`);
    console.log(`Ready to generate posts.`);
});