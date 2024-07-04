import express from "express";
import { CustomError } from "../helperFunctions/newClasses.js";

const router = express.Router();

router.get("/validate", (req, res, next) => {
  if (req.isAuthenticated()) {
    res.status(200).json(true);
  } else {
    res.json(false);
  }
});

export default router;
