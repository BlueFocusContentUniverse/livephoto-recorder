import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import React from "react";

export const Route = createRootRoute({
  component: () => {
    const location = useLocation();

    // Don't render the layout for the livephoto route
    if (location.pathname === "/livephoto") {
      return <Outlet />;
    }

    return (
      <>
        <div className="p-4 bg-gray-100 min-h-screen">
          <nav className="mb-6">
            <div className="flex gap-4">
              <Link
                to="/"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 [&.active]:bg-blue-700"
              >
                首页
              </Link>
              <Link
                to="/batch-generate"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 [&.active]:bg-blue-700"
              >
                批量生成
              </Link>
              <Link
                to={"/livp"}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 [&.active]:bg-blue-700"
              >
                LIVP 工具
              </Link>
            </div>
          </nav>
          <main className="bg-white p-6 rounded-lg shadow">
            <Outlet />
          </main>
        </div>
      </>
    );
  },
});
