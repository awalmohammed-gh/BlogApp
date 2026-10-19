import express from "express";
import { getPublicAdvertisement } from "../controllers/publicAdvertisementController.js";

const router = express.Router();

// Public endpoint for querying active, scheduled advertisements by placement
router.get("/", getPublicAdvertisement);

export default router;
