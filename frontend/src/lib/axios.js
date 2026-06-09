import axios from "axios";

const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.Capacitor) {
    if (import.meta.env.MODE === "production") {
      return "https://wartalap.onrender.com/api";
    }
    return "http://192.168.1.40:5001/api";
  }
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (import.meta.env.MODE === "development" || hostname === "localhost" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:5001/api`;
    }
  }
  return "/api";
};

export const axiosInstance = axios.create({
    baseURL: getBackendUrl(),
    withCredentials: true,
});