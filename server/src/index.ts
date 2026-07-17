import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import session from "express-session";
import dotenv from "dotenv";
import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/error";
import { loggerMiddleware } from "./middlewares/logger";
import { HTTP_STATUS } from "./constants";
import passport from "./config/passport";
import { initSocket } from "./config/socket";
import { initScheduler } from "./config/scheduler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "booth_rental_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(loggerMiddleware);

app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: "ok", timestamp: new Date() });
});

app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: `Không tìm thấy tuyến đường API: ${req.method} ${req.originalUrl}`
  });
});

app.use(errorHandler);

initSocket(app, PORT);
initScheduler();
