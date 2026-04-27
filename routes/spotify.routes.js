import { Router } from "express";
import { getTop10ByCountry, refreshSpotifyCharts } from "../controllers/spotify.controller.js";

const router = Router();

router.get("/popular/:country", getTop10ByCountry);
router.post("/refresh", refreshSpotifyCharts);

export default router;
