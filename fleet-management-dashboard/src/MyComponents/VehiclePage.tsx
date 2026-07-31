import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import "./VehiclePage.css";
import {
  Car,
  User,
  Building2,
  Gauge,
  Fuel,
  Calendar,
  Wrench,
  ChevronRight,
} from "lucide-react";

/*  Type matching the vehicles.csv column headers  */
interface VehicleRow {
  Registration: string;
  Model: string;
  Year: string;
  Driver: string;
  Department: string;
  "Current KM": string;
  "Fuel Level (%)": string;
  Status: "Active" | "Service Due" | "Breakdown";
  "Last Service Date": string;
  "Next Service KM": string;
}

async function loadCsv<T>(path: string, requiredColumn: string): Promise<T[]> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}. Make sure the file exists in /public/data.`);
  }
  const text = await res.text();
  if (text.trim().startsWith("<") || text.includes("<!DOCTYPE")) {
    throw new Error(
      `${path} returned an HTML page instead of CSV data. This means the file is missing from /public/data — check the path and restart your dev server.`
    );
  }

  const results = Papa.parse<T>(text, { header: true, skipEmptyLines: true });

  const firstRow = results.data[0] as Record<string, unknown> | undefined;
  if (!firstRow || !(requiredColumn in firstRow)) {
    throw new Error(
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what VehiclePage.tsx expects.`
    );
  }

  return results.data;
}

const formatDate = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusBadgeClass: Record<VehicleRow["Status"], string> = {
  Active: "badge badge-active",
  "Service Due": "badge badge-warning",
  Breakdown: "badge badge-danger",
};

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const v = await loadCsv<VehicleRow>("/data/vehicles.csv", "Registration");
        setVehicles(v);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load vehicle data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  if (loading) {
    return <div className="vehiclepage-loading">Loading vehicle data…</div>;
  }

  if (error) {
    return <div className="vehiclepage-error">{error}</div>;
  }

  return (
    <div className="vehiclepage">
      <div className="vehiclepage-header">
        <h1 className="vehiclepage-title">Vehicle Fleet</h1>
        <p className="vehiclepage-subtitle">
          Complete details for every vehicle in the fleet — {vehicles.length} total
        </p>
      </div>

      <div className="vehicle-grid">
        {vehicles.map((v) => {
          const fuelLevel = Number(v["Fuel Level (%)"] || 0);
          return (
            <div className="vehicle-card" key={v.Registration}>
              <div className="vehicle-card-top">
                <div className="vehicle-card-icon">
                  <Car size={22} />
                </div>
                <div>
                  <h2 className="vehicle-card-title">{v.Model}</h2>
                  <p className="vehicle-card-reg">{v.Registration}</p>
                </div>
                <span className={statusBadgeClass[v.Status]}>{v.Status}</span>
              </div>

              <div className="vehicle-card-details">
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Calendar size={14} /> Year
                  </span>
                  <span className="vehicle-detail-value">{v.Year}</span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <User size={14} /> Driver
                  </span>
                  <span className="vehicle-detail-value">{v.Driver}</span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Building2 size={14} /> Department
                  </span>
                  <span className="vehicle-detail-value">{v.Department}</span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Gauge size={14} /> Current KM
                  </span>
                  <span className="vehicle-detail-value">
                    {Number(v["Current KM"] || 0).toLocaleString()} km
                  </span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Fuel size={14} /> Fuel Level
                  </span>
                  <span className="vehicle-detail-value">
                    <div className="fuel-bar-track">
                      <div
                        className="fuel-bar-fill"
                        style={{
                          width: `${fuelLevel}%`,
                          backgroundColor:
                            fuelLevel > 50 ? "#22c55e" : fuelLevel > 25 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="fuel-bar-label">{fuelLevel}%</span>
                  </span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Wrench size={14} /> Last Service
                  </span>
                  <span className="vehicle-detail-value">{formatDate(v["Last Service Date"])}</span>
                </div>
                <div className="vehicle-detail-row">
                  <span className="vehicle-detail-label">
                    <Gauge size={14} /> Next Service KM
                  </span>
                  <span className="vehicle-detail-value">
                    {Number(v["Next Service KM"] || 0).toLocaleString()} km
                  </span>
                </div>
              </div>

              <Link
                to={`/VehiclesPage/${encodeURIComponent(v.Registration)}`}
                className="vehicle-card-link"
              >
                View Full Details
                <ChevronRight size={16} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
