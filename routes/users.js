import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/dbconfig.js";
import passport from "../config/passportConfig.js";

const router = express.Router();

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

router.post(`/checkEmailExistence`, async (req, res) => {
  const { email } = req.body;
  console.log("email existence endpoint fires");

  try {
    const result = await pool.query(
      `Select email from users where email = $1`,
      [email]
    );
    if (result.rowCount > 0) {
      res.status(409).json({ errorMessage: "Email Address already exists" });
    }
    if (result.rowCount === 0) {
      res.status(200).json("email adress is available to use");
    }
  } catch (error) {
    console.error(error);
    res.json(error.message);
  }
});

router.post("/logout", function (req, res, next) {
  try {
    console.log(req.user.id);
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      console.log(req?.user?.id);
      res.status(200).json({ message: "Successfully logged out" });
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});
export default router;
