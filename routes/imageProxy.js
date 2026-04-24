import { Router } from "express";
import { proxyImage } from "../controllers/proxyController.js";

const router = Router();
router.get("/image-proxy", proxyImage);

export default router;
