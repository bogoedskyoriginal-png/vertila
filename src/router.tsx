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
      { index: true, element: <Navigate to="/master" replace /> },
      { path: "master", element: <MasterPage /> },
      { path: "admin", element: <Navigate to="/master" replace /> },
      { path: "admin/:showId", element: <AdminPage /> },
      { path: "draw/:showId", element: <DrawPage /> },
      { path: "draw", element: <DrawPage /> }
    ]
  }
]);