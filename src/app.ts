import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import telemetryRoutes from "./routes/telemetry.routes";
import collarRoutes from "./routes/collar.routes";
import animalsRoutes from "./routes/animals.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app: Application = express();

// ===========================
// Middlewares básicos
// ===========================

// Seguridad básica
app.use(helmet());

// CORS abierto (Railway / apps móviles)
app.use(cors());

// Logging de requests
app.use(morgan("dev"));

// Parseo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================
// Rutas
// ===========================

app.use("/api", telemetryRoutes);
app.use("/api", collarRoutes);
app.use("/api", animalsRoutes);

// ===========================
// Health check
// ===========================

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString()
  });
});

// ===========================
// 404
// ===========================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// ===========================
// Manejo de errores
// ===========================

app.use(errorHandler);

export default app;