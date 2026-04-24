import { Router } from "express";
import {
  getPlaylist,
  getTop50Songs,
} from "../controllers/spotify.controller.js";

const router = Router();
// router.get("/popular/:country", getPlaylist);
router.get("/popular/:country_iso2", getTop50Songs);

export default router;
