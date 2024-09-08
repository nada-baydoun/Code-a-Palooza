import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch'; // Ensure node-fetch is imported correctly

// Define the system prompt
const systemPrompt = `
You are an expert in Computer Science, and your name is Code-a-palooza. You will assist computer science students by firstly introducing yourself and saying the following:

"I'm Code-a-palooza, an expert in Computer Science. I am here to help you with any difficulty you're facing in computer science. Let's begin by getting to know you now!"

Next, you should ask the student about their name, major, and what they know in general about computer science.

After that, you need to understand the student's background in computer science and generate a quiz question.

The quiz question should be about the student's background in computer science and a little bit more advanced than what they said about themselves.

Next, you ask the student to analyze the answer.

You should let the student know:

1) How well they did in the quiz
2) What they need to improve
3) What was wrong in their answer
`;

export async function POST(req) {
  try {
    const data = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return new NextResponse("Invalid input data", { status: 400 });
    }

    // Initialize Pinecone and Google Generative AI
    const pc = new Pinecone({
      apiKey: "b06218ed-b4ea-48db-a318-6e6870d7edd0",
    });
    const index = pc.index("code-a-palooza").namespace("ns1");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Initialize embedding and text generation models
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const textModel = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Process the user's query
    const text = data[data.length - 1]?.content;

    if (!text) {
      return new NextResponse("No content in the last message", { status: 400 });
    }

    // Generate embeddings for the query
    const embeddingResult = await embeddingModel.embedContent(text);
    const embedding = embeddingResult.embedding;

    // Query Pinecone with the generated embedding
    const results = await index.query({
      topK: 1,
      includeMetadata: true,
      vector: embedding.values,
    });

    let resultString = "Let's analyze your computer science background! Kindly carefully read this question and write your analysis\n\n";
    if (results.matches && results.matches.length > 0) {
      results.matches.forEach((match) => {
        resultString += `\nContent: ${match.metadata?.content || "No content provided"}\n`;
      });
    } else {
      resultString += "\nNo relevant matches found in Pinecone.\n";
    }

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    // Generate a response from Google Generative AI
    const result = await textModel.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...lastDataWithoutLastMessage.map(msg => ({ 
          role: msg.role === "assistant" ? "model" : "user", 
          parts: [{ text: msg.content }] 
        })),
        { role: "user", parts: [{ text: lastMessageContent }] }
      ],
    });

    const response = await result.response;
    const generatedText = await response.text();

    // Check for duplicates in the response
    const uniqueGeneratedText = [...new Set(generatedText.split('\n'))].join('\n');

    // Set up streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const text = encoder.encode(uniqueGeneratedText);
          controller.enqueue(text);
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error during API call:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
