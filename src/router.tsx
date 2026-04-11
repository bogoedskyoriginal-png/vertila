import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { DrawPage } from "./pages/DrawPage";
import { AdminPage } from "./pages/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/draw" replace /> },
      { path: "draw", element: <DrawPage /> },
      { path: "draw/:showId", element: <DrawPage /> },
      { path: "admin", element: <AdminPage /> }
    ]
  }
]);