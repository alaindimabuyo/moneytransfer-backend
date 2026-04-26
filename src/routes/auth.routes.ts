import { Router } from "express";
import { z } from "zod";
import { env, isProd } from "../config/env";
import {
  login,
  loginOrSignupWithGoogle,
  publicUser,
  signToken,
  signup,
} from "../services/auth.service";
import { requireAuth } from "../middleware/requireAuth";
import { User } from "../models";
import { notFound } from "../lib/errors";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function setSessionCookie(
  res: import("express").Response,
  token: string
) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const user = await signup(email, password);
    const token = signToken({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const user = await login(email, password);
    const token = signToken({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const googleSchema = z.object({
  idToken: z.string().min(10),
});

router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);
    const user = await loginOrSignupWithGoogle(idToken);
    const token = signToken({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(env.cookieName, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId!);
    if (!user) throw notFound("User not found");
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
