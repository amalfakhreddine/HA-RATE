import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? [process.env.FRONTEND_ORIGIN]
  : ["http://localhost:5000", "http://127.0.0.1:5000", "https://ha-rate.vercel.app"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === "development") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args] as any);
  };
  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    let line = `${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`;
    if (capturedJsonResponse) line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    console.log(line.length > 180 ? `${line.slice(0, 179)}…` : line);
  });
  next();
});

const routesReady = registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);
  if (res.headersSent) return;
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({ message: err?.message || "Internal Server Error" });
});

export default async function handler(req: Request, res: Response) {
  await routesReady;
  return app(req, res);
}
