import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import assistantRoutes from "./routes/assistant.routes";
import aiRoutes from "./routes/ai";
import meetingRoutes from "./routes/meetings";
import emailRoutes from "./routes/email";
import contactRoutes from "./routes/contact";

const app = express();
const PORT = config.PORT;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/assistant", assistantRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/contact", contactRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
