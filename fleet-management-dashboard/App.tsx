import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./MyComponents/Navbar";
import HomePage from "./MyComponents/HomePage";
import VehiclePage from "./MyComponents/VehiclePage";
import VehicleDetailPage from "./MyComponents/VehicleDetailPage";
import './App.css'

export default function App() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (

      <div className="app-container">
        <Navbar isOpen={isOpen} setIsOpen={setIsOpen} />
        <main className={`main-content ${isOpen ? "shifted" : ""}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/VehiclesPage" element={<VehiclePage />} />
            <Route path="/VehiclesPage/:registration" element={<VehicleDetailPage />} />
            {/* Add these pages as you build them out: */}
            {/* <Route path="/InfoPage" element={<InfoPage />} /> */}
            {/* <Route path="/DriversPage" element={<DriversPage />} /> */}
            {/* <Route path="/MaintenancePage" element={<MaintenancePage />} /> */}
            {/* <Route path="/AnalyticsPage" element={<AnalyticsPage />} /> */}
            {/* <Route path="/AlertsPage" element={<AlertsPage />} /> */}
            {/* <Route path="/SettingsPage" element={<SettingsPage />} /> */}
          </Routes>
        </main>
      </div>
  
  )
}