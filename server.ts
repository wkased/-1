import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Create the server app
const app = express();
const PORT = 3000;

// Lazy initialize the Google GenAI Client
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Support large Base64 uploads for images
app.use(express.json({ limit: "25mb" }));

// Express API endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/classify", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data in request body" });
    }

    const ai = getAIClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: image,
      },
    };

    const promptText = "Strictly analyze this uploaded image and identify its main subjects, animals, flowers, plants, structures, or scenic elements. Please generate 1 to 3 distinct interpretation choices for a postage stamp. For each choice, provide:\n" +
      "1. An elegant, professional 2-to-4 character traditional Chinese stamp title (zh) that perfectly represents the details in the image (e.g. '竹林双雏', '松壑飞泉', '翠袖红香', '岁寒三友').\n" +
      "2. A corresponding 5 or 7-character classical Chinese poetry phrase (poemZh) that describes this exact visual element elegantly.\n" +
      "3. A clean English translation of the title (en).\n" +
      "4. A poetic English description of the poetry phrase (poemEn).\n" +
      "5. A primary English keyword label representing the detected category.\n" +
      "Rank them by relevance to the actual visual content of the image.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: {
                type: Type.STRING,
                description: "Primary English lowercase keyword or category of the identified subject (e.g. 'cat', 'tiger', 'pine tree', 'lotus', 'mountain')."
              },
              score: {
                type: Type.NUMBER,
                description: "Confidence rating score between 0.0 and 1.0."
              },
              zh: {
                type: Type.STRING,
                description: "Sophisticated 2-to-4 character traditional Chinese stamp title (e.g., '狸奴昼憩', '映日红荷')."
              },
              en: {
                type: Type.STRING,
                description: "A beautiful English title translation."
              },
              poemZh: {
                type: Type.STRING,
                description: "A gorgeous, refined classical Chinese poetry line (e.g., '接天莲叶无穷碧', '竹阴闲看狸奴戏') matching the visual elements."
              },
              poemEn: {
                type: Type.STRING,
                description: "A matching literary English translation / poetic line."
              }
            },
            required: ["label", "score", "zh", "en", "poemZh", "poemEn"]
          },
        },
      },
    });

    const resultText = response.text || "[]";
    const parsed = JSON.parse(resultText);

    res.json(parsed);
  } catch (error: any) {
    console.error("Classification API error:", error);
    res.status(500).json({ error: error.message || "Failed to classify image with Gemini" });
  }
});

// Setup Vite Dev Server vs Static Production serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve SPA index.html for all other routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Bind to port 3000 on host 0.0.0.0
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
});
