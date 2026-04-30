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
            if (typeof skill === "string") return skill.trim();
            if (skill?.name) return skill.name.trim();
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

    const summaryText = (
      resume.professional_summary ||
      resume.summary ||
      ""
    ).trim();

    const profession = (
      resume.personal_info?.profession ||
      resume.profession ||
      ""
    ).trim();

    const hasResumeData =
      safeSkills.length > 0 ||
      safeEducation.length > 0 ||
      safeExperience.length > 0 ||
      safeProjects.length > 0 ||
      summaryText.length > 10 ||
      profession.length > 2;

    if (!hasResumeData) {
      return res.status(400).json({
        message:
          "Please fill your resume first. Add skills, education, experience, projects, or profession to get matched jobs.",
        ai: {
          jobTitle: "",
          keywords: [],
        },
        query: "",
        jobs: [],
      });
    }

    const resumeText = `
Title: ${resume.title || ""}
Profession: ${profession}
Summary: ${summaryText}
Skills: ${safeSkills.join(", ")}
Education: ${safeEducation.join(", ")}
Experience: ${safeExperience.join(", ")}
Projects: ${safeProjects.join(", ")}
`;

    let parsed = {
      jobTitle: "",
      keywords: [],
    };

    try {
      const completion = await ai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert career assistant. Return only valid JSON. No markdown. No explanation.",
          },
          {
            role: "user",
            content: `
Analyze this resume and return valid JSON only:

{
  "jobTitle": "best matching job title",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- Do not force software/web developer jobs.
- Detect correct field from resume.
- Support CSE, mechanical, civil, electrical, electronics, HR, finance, management, sales, marketing, etc.
- Keywords should be useful for job search.
- If data is weak, use profession, skills, education, or projects.

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
      console.log("AI failed, using fallback:", aiError.message);
    }

    if (!parsed || typeof parsed !== "object") {
      parsed = {
        jobTitle: "",
        keywords: [],
      };
    }

    if (!parsed.jobTitle || !parsed.jobTitle.trim()) {
      const skillText = safeSkills.join(" ").toLowerCase();
      const educationText = safeEducation.join(" ").toLowerCase();
      const projectText = safeProjects.join(" ").toLowerCase();

      const allText = `${skillText} ${educationText} ${projectText} ${profession}`.toLowerCase();

      if (
        /react|node|javascript|java|next|mongodb|express|html|css|python|c\+\+|cse|computer|software|web/.test(
          allText
        )
      ) {
        parsed.jobTitle = "Software Developer";
      } else if (profession) {
        parsed.jobTitle = profession;
      } else if (safeExperience.length > 0) {
        parsed.jobTitle = safeExperience[0];
      } else if (safeEducation.length > 0) {
        parsed.jobTitle = safeEducation[0];
      } else if (safeProjects.length > 0) {
        parsed.jobTitle = safeProjects[0];
      } else if (safeSkills.length > 0) {
        parsed.jobTitle = safeSkills[0];
      }
    }

    if (!parsed.jobTitle || !parsed.jobTitle.trim()) {
      return res.status(400).json({
        message:
          "Please add skills, education, experience, projects, or profession before finding jobs.",
        ai: {
          jobTitle: "",
          keywords: [],
        },
        query: "",
        jobs: [],
      });
    }

    if (!Array.isArray(parsed.keywords)) {
      parsed.keywords = [];
    }

    if (parsed.keywords.length === 0) {
      parsed.keywords = [
        ...safeSkills.slice(0, 5),
        profession,
        ...safeEducation.slice(0, 1),
        ...safeProjects.slice(0, 1),
      ].filter(Boolean);
    }

    parsed.jobTitle = parsed.jobTitle.trim();
    parsed.keywords = parsed.keywords
      .map((keyword) => String(keyword).trim())
      .filter(Boolean);

    const query = `${parsed.jobTitle} ${parsed.keywords
      .slice(0, 3)
      .join(" ")} jobs India`.trim();

    if (!query || query === "jobs India") {
      return res.status(400).json({
        message:
          "Please add proper resume details before finding matched jobs.",
        ai: parsed,
        query: "",
        jobs: [],
      });
    }

    let jobs = [];

    try {
      const jobsResponse = await fetchJobsFromSerpApi(query);
      jobs = jobsResponse?.data?.jobs_results || [];
    } catch (serpError) {
      console.log("SerpAPI Error status:", serpError?.response?.status);
      console.log("SerpAPI Error data:", serpError?.response?.data);
      console.log("SerpAPI Error message:", serpError.message);

      return res.status(200).json({
        message: "Jobs temporarily unavailable. Please try again later.",
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