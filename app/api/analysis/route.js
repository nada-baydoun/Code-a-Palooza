import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    // Parse the incoming request body
    const data = await req.json();
    const { studentInfo, question, userAnswer } = data;

    // Validate that all required data is present
    if (!studentInfo || !question || !userAnswer) {
      return new NextResponse(
        JSON.stringify({ error: "Student info, question, and user answer are all required." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { technicalLevel, goal } = studentInfo;

    // Ensure the technical level and goal are provided
    if (!technicalLevel || !goal) {
      return new NextResponse(
        JSON.stringify({ error: "Technical level and goal are required." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // Prepare the AI analysis prompt
    const analysisPrompt = `
    You are a Computer Science expert. The question was:
    "${question}"

    The student answered:
    "${userAnswer}"

    The student's technical level is: 
    "${technicalLevel}"

    The student's goal is:
    "${goal}"

    Please analyze this answer, for each question, you should analyze the problem solving skills, critical thinking skills, their knowledge of their goal, and their logic.

    Take into consideration the technical level they are in. 
    
    Your response should look like this: 

    """
    Let's check the answer together! 

    You were able to answer correctly: (enumerate the correct parts of the answer), which shows that you have good skills in (based on correct answers, mention the skills).

    All the enumerated aspects should be in a list 

    However, you missed the following points: (enumerate the wrong parts of the answer ), which shows that you need to improve in (based on incorrect answers, mention the skills to improve).

    IT IS PROHIBITED TO ADD ANY UNECESSARY PONCTUATIONS, SYMBOLS, OR EVEN QUOTATIONS AND STARS

    IMPORTANT: Respond in clear and concise sentences, DO NOT MAKE THE RESPONSES LONG AND DO NOT INCLUDE UNECESARY QUOTATIONS AND STARS. DO NOTHING BETWEEN 2 STARTS.
        
    - Format the response in plain text without any unnecessary symbols.
    - Do NOT include any quotation marks, hashtags, or other Markdown formatting.
    - List all items in a simple, readable format.
    -When talking about the imporovements, enter a NEW LINE 
    `;

    // Generate the analysis using the AI model
    const aiResponse = await textModel.generateContent({
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
    });

    // Extract the text from the first candidate in the AI response
    const responseText = aiResponse.response.candidates[0].output || aiResponse.response.text() || "No valid response received from AI";
    console.log("Full AI Response:", aiResponse.response.text());

    // Return the AI-generated analysis
    return new NextResponse(responseText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error("Error during AI analysis:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
