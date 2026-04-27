import { Router } from "express";
import { getTop10ByCountry } from "../controllers/spotify.controller.js";

const router = Router();

router.get("/popular/:country", getTop10ByCountry);

export default router;
