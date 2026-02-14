import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { Overview } from "./views/Overview";
import { Services } from "./views/Services";
import { Orders } from "./views/Orders";
import { Track } from "./views/Track";
import { AI } from "./views/IA";
import { Drip } from "./views/Drip";
import { Login } from "./views/Auth/Login";
import { Register } from "./views/Auth/Register";
import { Config } from "./views/Config";
import { Teams } from "./views/Teams";

export const router = createBrowserRouter([
    {
        path: "/",
        children: [
            {
                path: "/login", index: true, element: <Login />
            },
            {
                path: "/register", element: <Register />
            }
        ]
    },
    {
        path: "/",
        element: <DashboardLayout />,
        children: [
            {
                path: "/dashboard", element: <Overview />,
            },
            {
                path: "/services", element: <Services />
            },
            {
                path: "/commandes", element: <Orders />
            },
            {
                path: "/track", element: <Track />
            },
            {
                path: "/ia", element: <AI />
            },
            {
                path: "/drip", element: <Drip />
            },
            {
                path: "/team", element: <Teams />
            },
            {
                path: "/config", element: <Config />
            }
        ]
    }
])