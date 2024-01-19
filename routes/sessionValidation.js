import express from "express";

const router = express.Router();

router.get("/validate", (req, res) => {
  if (req.isAuthenticated()) {
    res.send(true);
  } else {
    res.send(false);
  }
});

export default router;
