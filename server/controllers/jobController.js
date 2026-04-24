import axios from "axios";
import Resume from "../models/Resume.js";
import ai from "../configs/ai.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJobsFromSerpApi = async (query) => {
  try {
    return await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_jobs",
        q: query,
        location: "India",
        google_domain: "google.com",
        hl: "en",
        gl: "in",
        api_key: process.env.SERP_API_KEY,
      },
      timeout: 20000,
    });
  } catch (error) {
    if (error?.response?.status === 429) {
      console.log("SerpAPI rate limited. Retrying after 2 seconds...");
      await sleep(2000);

      return await axios.get("https://serpapi.com/search", {
        params: {
          engine: "google_jobs",
          q: query,
          location: "India",
          google_domain: "google.com",
          hl: "en",
          gl: "in",
          api_key: process.env.SERP_API_KEY,
        },
        timeout: 20000,
      });
    }

    throw error;
  }
};

export const getAiMatchedJobs = async (req, res) => {
  try {
    const { resumeId } = req.params;

    if (!resumeId) {
      return res.status(400).json({ message: "Resume ID is required" });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    if (!process.env.SERP_API_KEY) {
      return res.status(500).json({
        message: "SERP_API_KEY is missing in .env",
      });
    }

    const safeSkills = Array.isArray(resume.skills)
      ? resume.skills
          .map((skill) => {
            if (typeof skill === "string") return skill;
            if (skill?.name) return skill.name;
            return "";
          })
          .filter(Boolean)
      : [];

    const safeEducation = Array.isArray(resume.education)
      ? resume.education
          .map((e) => `${e?.degree || ""} ${e?.school || ""}`.trim())
          .filter(Boolean)
      : [];

    const safeExperience = Array.isArray(resume.experience)
      ? resume.experience
          .map((e) => `${e?.title || ""} ${e?.company || ""}`.trim())
          .filter(Boolean)
      : [];

    const safeProjects = Array.isArray(resume.projects)
      ? resume.projects
          .map((p) => `${p?.title || ""} ${p?.description || ""}`.trim())
          .filter(Boolean)
      : [];

    const resumeText = `
Title: ${resume.title || ""}
Summary: ${resume.summary || ""}
Skills: ${safeSkills.join(", ")}
Education: ${safeEducation.join(", ")}
Experience: ${safeExperience.join(", ")}
Projects: ${safeProjects.join(", ")}
`;

    let parsed = {
      jobTitle: safeSkills.includes("React")
        ? "Full Stack Developer"
        : "Software Developer",
      keywords: safeSkills.length ? safeSkills.slice(0, 8) : ["JavaScript", "React", "Node.js"],
    };

    try {
      const completion = await ai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You extract job search metadata from resumes. Return only valid JSON. No markdown. No explanation.",
          },
          {
            role: "user",
            content: `
Analyze this resume and return valid JSON only in this exact format:
{
  "jobTitle": "best matching job title",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Resume:
${resumeText}
            `,
          },
        ],
        temperature: 0.2,
      });

      let content = completion?.choices?.[0]?.message?.content?.trim();

      if (content) {
        content = content.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(content);
      }
    } catch (aiError) {
      console.log("AI failed, using fallback query:", aiError.message);
    }

    const jobTitle = parsed?.jobTitle || "Software Developer";
    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : [];

    const query = `${jobTitle} ${keywords.join(" ")}`.trim();

    let jobs = [];

    try {
      const jobsResponse = await fetchJobsFromSerpApi(query);
      jobs = jobsResponse?.data?.jobs_results || [];
    } catch (serpError) {
      console.log("SerpAPI Error status:", serpError?.response?.status);
      console.log("SerpAPI Error data:", serpError?.response?.data);
      console.log("SerpAPI Error message:", serpError.message);

      return res.status(200).json({
        message: "Jobs temporarily unavailable. Please try again after some time.",
        ai: parsed,
        query,
        jobs: [],
      });
    }

    return res.status(200).json({
      message: "Jobs fetched successfully",
      ai: parsed,
      query,
      jobs,
    });
  } catch (error) {
    console.log("Job Match Error:", error.message);

    return res.status(500).json({
      message: error.message || "Server error while fetching matched jobs",
    });
  }
};