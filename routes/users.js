import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/dbconfig.js";
import passport from "../config/passportConfig.js";

const router = express.Router();

router.get("/view", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    if (result.rowCount > 0) {
      res.status(200).json({
        success: true,
        message: "successfully retrieved data",
        data: result.rows,
      });
    } else {
      res.status(204);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "insert into users(email,password)values($1,$2)",
      [email, hashedPassword]
    );

    if (result.rowCount > 0) {
      res
        .status(201)
        .json({ success: true, message: "user successfully created" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "internal server error" });
  }
});

router.post("/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json({ message: "Login successful", data: req.user });
});

export default router;
