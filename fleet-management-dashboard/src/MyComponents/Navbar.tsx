import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/company-logo.png";
import {
  Home,
  Truck,
  FileText,
  Users,
  Wrench,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
} from "lucide-react";

interface NavBarProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Vehicles", to: "/VehiclesPage", icon: Truck },
  { label: "Report", to: "/ReportPage", icon: FileText },
  { label: "Drivers", to: "/DriversPage", icon: Users },
  { label: "Maintenance", to: "/MaintenancePage", icon: Wrench },
  { label: "Analytics", to: "/AnalyticsPage", icon: BarChart3 },
  { label: "Alerts", to: "/AlertsPage", icon: Bell },
  { label: "Settings", to: "/SettingsPage", icon: Settings },
];

export default function NavBar({ isOpen, setIsOpen }: NavBarProps) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className="sidebar-header">
        {isOpen && (
          <img src={logo} alt="Company Logo" className="sidebar-logo" />
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, to, icon: Icon }) => (
          <Link key={label} to={to} className="sidebar-link">
            <Icon size={20} className="sidebar-icon" />
            {isOpen && <span className="sidebar-label">{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}