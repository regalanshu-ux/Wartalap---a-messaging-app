import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file from the backend directory,
// ensuring env variables are loaded correctly regardless of where Node.js process was started from.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
