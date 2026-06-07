import axios from "axios";

const BACKEND_URL = "http://192.168.1.40:5001";

export const axiosInstance = axios.create({
    baseURL: typeof window !== "undefined" && window.Capacitor
      ? `${BACKEND_URL}/api`
      : (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api"),
    withCredentials: true,
});