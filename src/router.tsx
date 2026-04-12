import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { DrawPage } from "./pages/DrawPage";
import { AdminPage } from "./pages/AdminPage";
import { MasterPage } from "./pages/MasterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/crp.html" replace /> },
      // Master admin (secret entry). Keep /master as an alias for backwards compatibility.
      { path: "crp.html", element: <MasterPage /> },
      { path: "master", element: <MasterPage /> },
      { path: ":code/admin", element: <AdminPage /> },
      { path: ":code", element: <DrawPage /> }
    ]
  }
]);
