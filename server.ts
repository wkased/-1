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

    const promptText = "Identify the major subject, background elements and objects visible in this image. Classify it into top 1 to 3 categories. Return a structured JSON list of categories ranked by confidence score. Labels should match english keywords list of predictions, starting with the main category of the identified subject (e.g. 'cat, kitten, pet' or 'flower, rose, flora' or 'mountain, valley, scenic'). Use lowercase for label keywords.";

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
                description: "Comma-separated keywords list of predictions, starting with the main category (e.g. 'cat, kitty' or 'mountain, hills' or 'flower, botany'). Please use lowercase.",
              },
              score: {
                type: Type.NUMBER,
                description: "Confidence rating score between 0.0 and 1.0.",
              },
            },
            required: ["label", "score"],
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
