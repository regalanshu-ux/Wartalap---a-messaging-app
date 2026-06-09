import axios from "axios";

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    if (window.Capacitor) {
      if (import.meta.env.MODE === "production") {
        return "https://wartalap.onrender.com/api";
      }
      return "http://192.168.1.40:5001/api";
    }
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname.startsWith("127.0.") || hostname.startsWith("192.168.");
    if (import.meta.env.MODE === "production") {
      if (isLocalhost && (window.location.protocol === "http:" || window.location.protocol === "file:")) {
        return "https://wartalap.onrender.com/api";
      }
      return "/api";
    }
    if (isLocalhost) {
      return `http://${hostname}:5001/api`;
    }
  }
  return "/api";
};

export const axiosInstance = axios.create({
    withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl();
  return config;
});