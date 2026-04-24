import express from "express";
import { getAiMatchedJobs } from "../controllers/jobController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const jobRouter = express.Router();

jobRouter.get("/ai-match/:resumeId", authMiddleware, getAiMatchedJobs);

export default jobRouter;