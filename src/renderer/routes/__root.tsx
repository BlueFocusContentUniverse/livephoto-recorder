import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import React from "react";

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-4 bg-gray-100 min-h-screen">
        <nav className="mb-6">
          <div className="flex gap-4">
            <Link
              to="/"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 [&.active]:bg-blue-700"
            >
              Home
            </Link>
          </div>
        </nav>
        <main className="bg-white p-6 rounded-lg shadow">
          <Outlet />
        </main>
      </div>
    </>
  ),
});
