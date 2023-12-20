import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import userRoute from "./routes/users.js";
import patientRoute from "./routes/patients.js";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import pool from "./config/dbconfig.js";
import bcrypt from "bcrypt";

// Initialize Express and PostgreSQL pool

const app = express();
const port = process.env.SERVER_PORT;

// Middleware for parsing JSON and URL-encoded bodies
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Serialize and deserialize user for session
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Local Strategy for username and password login
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Routes
app.use("/users", userRoute);
app.use("/patients", patientRoute);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
