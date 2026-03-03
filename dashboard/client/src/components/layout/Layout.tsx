import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="bg-ambient min-h-screen">
      <Sidebar />
      <main className="relative z-10 ml-64 min-h-screen">
        <div className="px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
