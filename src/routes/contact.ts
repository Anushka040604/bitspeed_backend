import { Router } from "express";
import { identifyContact } from "../controllers/contactController";

const router = Router();

router.post("/identify", identifyContact);

export default router;