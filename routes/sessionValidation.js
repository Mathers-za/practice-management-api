import express from "express";
import { CustomError } from "../helperFunctions/newClasses.js";

const router = express.Router();

router.get("/validate", (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    throw new CustomError("Unauthorised", "Unauthorised access", 401);
  }
});

export default router;
