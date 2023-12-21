import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import pool from "./dbconfig.js";
import bcrypt from "bcrypt";

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

export default passport;
