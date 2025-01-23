import { useState } from "react";
import { ChartNoAxesColumn, SquareLibrary } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 w-full sm:w-[300px] h-screen bg-white dark:bg-gray-900 z-50
        transition-transform transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:block border-r border-gray-300 dark:border-gray-700`}>
        <div className="md:hidden fixed top-3 right-0">
          {/* Close Icon */}
          <button onClick={closeSidebar}
            className="text-xl text-gray-800 dark:text-white">
            ✖
          </button>
        </div>

        <div className="space-y-3">
          {/* Dashboard Link */}
          <Link
            to="dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 p-4 rounded-md transition-all">
            <ChartNoAxesColumn size={22} />
            <h1>Dashboard</h1>
          </Link>

          {/* Courses Link */}
          <Link
            to="course"
            onClick={closeSidebar}
            className="flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 p-4 rounded-md transition-all">
            <SquareLibrary size={22} />
            <h1>Courses</h1>
          </Link>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-16">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-gray-300 dark:bg-gray-800 rounded-md">
          ☰
        </button>
      </div>

      <div className="flex-1 p-2 pt-10 md:p-4 lg:ml-[300px] h-screen overflow-y-auto transition-all scrollbar-hide">
        <Outlet />
      </div>
    </div>
  );
};

export default Sidebar;
