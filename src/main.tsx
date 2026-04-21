import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runLocalStorageMigrations } from "./lib/localStorageMigrations";

runLocalStorageMigrations();

createRoot(document.getElementById("root")!).render(<App />);
