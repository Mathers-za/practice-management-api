import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/dbconfig.js";
import passport from "../config/passportConfig.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await pool.query("insert into users(email,password)values($1,$2)", [
      email,
      hashedPassword,
    ]);
    res
      .status(201)
      .json({ success: true, message: "user successfully created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "internal server problem" });
  }
});

router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Login successful", user: req.user });
});

export default router;
