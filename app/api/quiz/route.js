import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory storage for quiz questions (in a real application, use a database)
const quizSessions = new Map();

const systemPrompt = `
You are an expert in Computer Science, and your name is Code-a-palooza. 

You will generate 3 quiz questions based on the student's current technical level and goal. 

The questions should be a bit more advanced than their current knowledge but relevant to their goal. 

First Question: General Knowledge (easy)

The first question should test their general knowledge about the goal they want. You should ask the user about anything general related to his goal. 

For example, if the goal of the user is a data scientist, ask them about the most important task a data scientist should do.

Second Question: Critical Thinking (Medium)

The second question should test the student's ability to do critical thinking based on the goal and their technical level.

For example: "Let's say we have a dataset of 1000 rows and 10 columns, one of the columns is about a person's age, how would you analyze this data? and what would you do with an age entry that is negative? State all steps you can think of."

Third Question: In-depth Technical Knowledge (Hard)

The third question should test the student's in-depth technical knowledge about the goal. 

For example: "Discuss the difference between supervised and unsupervised learning, and suggest an algorithm for each. Explain step by step how the algorithm works."

Note that all the questions should need the user's critical thinking ability, I want all quizzes to be at least 2 lines, each quiz can have mmore than 1 question. 

IMPORTANT: Format your response as a valid JSON array of 3 strings, where each string is a question. Do not include any Markdown formatting, code blocks, or other text. Only return the raw JSON array.
`;

export async function POST(req) {
  try {
    const data = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return new NextResponse("Invalid input data", { status: 400 });
    }

    const studentInfo = data[0];
    const technicalLevel = studentInfo.technicalLevel?.trim();
    const goal = studentInfo.goal?.trim();
    const questionNumber = studentInfo.questionNumber || 1;

    if (!technicalLevel || !goal) {
      return new NextResponse("Technical level and goal are required", { status: 400 });
    }

    const sessionKey = `${technicalLevel}-${goal}`;
    console.log("Session key:", sessionKey);
    // Check if we already have questions for this session
    if (!quizSessions.has(sessionKey)) {
      // Generate new questions
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index("code-a-palooza").namespace("ns1");

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
      const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      const queryText = `${technicalLevel} student aiming to achieve ${goal}.`;

      const embeddingResult = await embeddingModel.embedContent(queryText);
      let embedding = embeddingResult.embedding.values;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Invalid embedding format");
      }

      const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding,
      });

      let relevantMaterial = "Here's some material related to your goal:\n";
      results.matches.forEach(match => {
        relevantMaterial += `\nContent: ${match.metadata?.content || "No content"}\n`;
      });

      const prompt = `
        The student is at a ${technicalLevel} level and wants to achieve ${goal}. 
        Based on their background and this material: ${relevantMaterial}, generate 3 quiz questions and format them as a JSON array of 3 strings.
      `;

      const result = await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt + prompt }] }],
      });

      const response = result.response;
      let generatedQuiz = response.text();
      console.log("Raw generated quiz:", generatedQuiz);

      // Remove any Markdown formatting or extra text
      generatedQuiz = generatedQuiz.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

      // Ensure the string starts with '[' and ends with ']'
      if (!generatedQuiz.startsWith('[') || !generatedQuiz.endsWith(']')) {
        throw new Error("Generated content is not a valid JSON array");
      }

      // Parse the JSON string to ensure it's valid
      const quizQuestions = JSON.parse(generatedQuiz);
      //console.log("Parsed quiz questions:", quizQuestions[0]);
      if (!Array.isArray(quizQuestions) || quizQuestions.length !== 3) {
        throw new Error("Generated content is not a valid array of 3 questions");
      }

      // Store the questions for this session
      quizSessions.set(sessionKey, quizQuestions);
    }

    // Retrieve the questions for this session
    const quizQuestions = quizSessions.get(sessionKey);

    // Return the appropriate question based on the question number
    if (questionNumber >= 1 && questionNumber <= 3) {
        
        return new NextResponse(quizQuestions[questionNumber - 1], {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
      
    } else {
      return new NextResponse(JSON.stringify({ error: "Invalid question number" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Error during API call:", error);
    return new NextResponse(JSON.stringify({ error: error.message, stack: error.stack }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}