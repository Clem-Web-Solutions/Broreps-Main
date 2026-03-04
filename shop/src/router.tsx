import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layouts/Layout";
import { Welcome } from "./views/Welcome";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <Welcome />
            }
        ]
    }
])