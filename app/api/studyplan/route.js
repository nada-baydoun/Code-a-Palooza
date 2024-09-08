import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const data = await req.json();
    const { studentInfo, aiAnalysis } = data;

    if (!studentInfo || !aiAnalysis) {
      return new NextResponse(
        JSON.stringify({ error: "Student info and AI analysis are required." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { technicalLevel, goal } = studentInfo;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const studyPlanPrompt = `
    Based on the following student information and AI analysis, create a personalized study plan:
    
    Student Technical Level: ${technicalLevel}
    Student Goal: ${goal}
    AI Analysis: ${aiAnalysis}
  
    The study plan should address the areas of improvement identified in the AI analysis and include:
    1. A list of 3-5 specific topics to focus on
    2. Recommended resources (books, online courses, tutorials) for each topic
    3. A suggested timeline for completing each topic (e.g., 1 week, 2 weeks)
    4. At least one hands-on project idea related to the student's goal
  
    IMPORTANT:
    - Format the response in plain text without any unnecessary symbols.
    - Do NOT include any quotation marks, hashtags, or other Markdown formatting.
    - List all items in a simple, readable format.
  `;
  

    const aiResponse = await textModel.generateContent({
      contents: [{ role: "user", parts: [{ text: studyPlanPrompt }] }],
    });

    const studyPlan = aiResponse.response.text();

    return new NextResponse(studyPlan, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error("Error generating study plan:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}