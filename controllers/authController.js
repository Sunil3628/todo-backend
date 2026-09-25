const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { AuthForgeClient } = require("authforge-sdk");

const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri
);
const authForge = process.env.AUTHFORGE_CONNECTION_STRING
  ? new AuthForgeClient(process.env.AUTHFORGE_CONNECTION_STRING)
  : null;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = user.password && await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGoogleSession = async (payload) => {
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new Error("Invalid Google account");
  }

  const email = payload.email.toLowerCase();

  if (authForge) {
    await authForge.loginWithGoogle({
      email,
      googleId: payload.sub,
      name: payload.name || email.split("@")[0],
      picture: payload.picture,
    });
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      googleId: payload.sub,
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  return {
    token: generateToken(user),
    user: { id: user._id, name: user.name, email: user.email },
  };
};

const googleStart = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ message: "Google OAuth is not configured on the backend" });
  }

  const authorizationUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
  });

  res.redirect(authorizationUrl);
};

const googleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  try {
    if (req.query.error) {
      return res.redirect(`${frontendUrl}/?authError=${encodeURIComponent(req.query.error)}`);
    }

    if (!req.query.code) {
      return res.status(400).send("Google authorization code is missing");
    }

    const { tokens } = await googleClient.getToken(req.query.code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const session = await createGoogleSession(ticket.getPayload());

    const params = new URLSearchParams({
      token: session.token,
      user: JSON.stringify(session.user),
    });

    res.redirect(`${frontendUrl}/?${params.toString()}`);
  } catch (error) {
    res.redirect(`${frontendUrl}/?authError=${encodeURIComponent("Google sign-in failed")}`);
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: "Google sign-in is not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ message: "Invalid Google account" });
    }

    const session = await createGoogleSession(payload);

    res.status(200).json({
      message: "Google login successful",
      ...session,
    });
  } catch (error) {
    res.status(401).json({ message: "Google sign-in failed" });
  }
};

module.exports = { register, login, googleLogin, googleStart, googleCallback };