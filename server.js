// Importing required modules
import pkg from 'pg';
const { Pool } = pkg;
import express from 'express';
import session from 'express-session';

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

// Initialize Express and PostgreSQL pool
const app = express();
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'test',
  password: 'batman',
  port: 5432,
});

// Middleware for parsing JSON and URL-encoded bodies
app.use(
    session({
      secret: 'your_secret_key', // Replace with a strong, random secret
      resave: false,
      saveUninitialized: false,
    })
  );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Serialize and deserialize user for session
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Local Strategy for username and password login
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: 'Incorrect email.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Routes
app.post('/login', passport.authenticate('local'), (req, res) => {
  // Successful login
  res.json({ message: 'Login successful', user: req.user });
});

app.post("/register", async (req,res)=>{
    const {email,password} =req.body;
    const hashedPassword = await bcrypt.hash(password,10);
    console.log(hashedPassword);
    try { await pool.query("insert into users(email,password)values($1,$2)",[email,hashedPassword])
        
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"internal server problem"})
        
    }
})

// Create users table if not exists
pool.query(
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  )`,
  (err) => {
    if (err) throw err;

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  }
);


