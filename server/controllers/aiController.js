
import ai from "../configs/ai.js";
import Resume from "../models/Resume.js";

const getAiText = (response) => response?.choices?.[0]?.message?.content?.trim();

const parseJsonContent = (content) => {
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
};

const getErrorMessage = (error) =>
  error.response?.data?.error?.message ||
  error.response?.data?.message ||
  error.error?.message ||
  error.message ||
  "Something went wrong";

const validateAiConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey || !model) {
    throw new Error("Missing OPENAI_API_KEY or OPENAI_MODEL in server/.env");
  }

  if (baseURL?.includes("generativelanguage.googleapis.com") && !apiKey.startsWith("AIza")) {
    throw new Error(
      "OPENAI_API_KEY must be a Gemini API key from Google AI Studio when using the Gemini base URL"
    );
  }
};

// Controller for enhancing a resume's professional summary
// POST: /api/ai/enhanced-pro-sum
export const enhanceProfessionalSummary = async (req, res) => {
  try {
    validateAiConfig();

    const { userContent } = req.body;

    if (!userContent) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in resume writing. Your task is to enhance the professional summary of a resume. The summary should be 1-2 sentences also highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly. And only return text no options or anything else.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const enhancedContent = getAiText(response);

    if (!enhancedContent) {
      return res.status(502).json({ message: "AI returned an empty response" });
    }

    return res.status(200).json({ enhancedContent });
  } catch (error) {
    console.error("enhanceProfessionalSummary error:", error.response?.data || error.message);
    const message = getErrorMessage(error);
    return res.status(400).json({ message });
  }
};

// Controller for enhancing a resume's job description
// POST: /api/ai/enhanced-job-desc
export const enhanceJobDescription = async (req, res) => {
  try {
    validateAiConfig();

    const { userContent } = req.body;

    if (!userContent) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in resume writing. Your task is to enhance the job description of a resume. The job description should be only in 1-2 sentence also highlighting key responsibilities and achievements. Use action verbs and quantifiable results where possible. Make it ATS-friendly. And only return text no options or anything else.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const enhancedContent = getAiText(response);

    if (!enhancedContent) {
      return res.status(502).json({ message: "AI returned an empty response" });
    }

    return res.status(200).json({ enhancedContent });
  } catch (error) {
    console.error("enhanceJobDescription error:", error.response?.data || error.message);
    const message = getErrorMessage(error);
    return res.status(400).json({ message });
  }
};

// Controller for uploading a resume to the database
// POST: /api/ai/upload-resume
export const uploadResume = async (req, res) => {
  try {
    validateAiConfig();

    const { resumeText, title } = req.body;
    const userId = req.userId;

    if (!resumeText) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const systemPrompt =
      "You are an expert resume parser. Extract resume data and return only valid JSON.";

    const userPrompt = `extract data from this resume: ${resumeText}
    
    Provide data in this exact JSON shape with real values, not schema definitions.
    Use empty strings, empty arrays, and false when data is not found.
    Return no additional text before or after the JSON.

    {
      "professional_summary": "",
      "skills": [],
      "personal_info": {
        "image": "",
        "full_name": "",
        "profession": "",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "website": ""
      },
      "experience": [
        {
          "company": "",
          "position": "",
          "start_date": "",
          "end_date": "",
          "description": "",
          "is_current": false
        }
      ],
      "project": [
        {
          "name": "",
          "type": "",
          "description": ""
        }
      ],
      "education": [
        {
          "institution": "",
          "degree": "",
          "field": "",
          "graduation_date": "",
          "gpa": ""
        }
      ]
    }
    `;

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const extractedData = getAiText(response);
    const parsedData = parseJsonContent(extractedData);

    // create new resume in the database
    const newResume = await Resume.create({ userId, title, ...parsedData });

    res.json({ resumeId: newResume._id });
  } catch (error) {
    console.error("uploadResume error:", error.response?.data || error.message);
    const message = getErrorMessage(error);
    return res.status(400).json({ message });
  }
};
