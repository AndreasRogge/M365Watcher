import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
