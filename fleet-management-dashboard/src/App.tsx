import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./MyComponents/Navbar";
import HomePage from "./MyComponents/HomePage";
import './App.css'

export default function App() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (

      <div className="app-container">
        <Navbar isOpen={isOpen} setIsOpen={setIsOpen} />
        <main className={`main-content ${isOpen ? "shifted" : ""}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Add these pages as you build them out: */}
            {/* <Route path="/VehiclesPage" element={<VehiclesPage />} /> */}
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