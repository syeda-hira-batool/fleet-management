import { useState } from "react";
import Navbar from "./MyComponents/Navbar";
import './App.css'

export default function App() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="app-container">
      <Navbar isOpen={isOpen} setIsOpen={setIsOpen} />
      <main className={`main-content ${isOpen ? "shifted" : ""}`}>
        {/* Your routed page content goes here */}
      </main>
    </div>
  )
}