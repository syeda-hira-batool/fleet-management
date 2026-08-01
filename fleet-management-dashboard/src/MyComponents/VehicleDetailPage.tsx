import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Papa from "papaparse";
import "./css files/VehicleDetailPage.css";
import {
  ArrowLeft,
  Car,
  User,
  Building2,
  Gauge,
  Fuel,
  Calendar,
  Wrench,
  AlertTriangle,
  Clock,
} from "lucide-react";

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

interface MaintenanceRow {
  Registration: string;
  Date: string;
  "Service Type": string;
  Description: string;
  "Cost (PKR)": string;
  Workshop: string;
}

interface BreakdownRow {
  Registration: string;
  Date: string;
  Problem: string;
  "Downtime (Hours)": string;
  "Repair Cost (PKR)": string;
  Status: string;
}

interface UpcomingServiceRow {
  Registration: string;
  "Due Date": string;
  "Due KM": string;
  "Service Type": string;
  Priority: "High" | "Medium" | "Low";
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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what VehicleDetailPage.tsx expects.`
    );
  }

  return results.data;
}

const formatPKR = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;

const formatDate = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const priorityColor: Record<UpcomingServiceRow["Priority"], string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

const statusBadgeClass: Record<VehicleRow["Status"], string> = {
  Active: "badge badge-active",
  "Service Due": "badge badge-warning",
  Breakdown: "badge badge-danger",
};

export default function VehicleDetailPage() {
  const { registration } = useParams<{ registration: string }>();

  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
  const [upcomingServices, setUpcomingServices] = useState<UpcomingServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [v, m, b, us] = await Promise.all([
          loadCsv<VehicleRow>("/data/vehicles.csv", "Registration"),
          loadCsv<MaintenanceRow>("/data/maintenance.csv", "Registration"),
          loadCsv<BreakdownRow>("/data/breakdowns.csv", "Registration"),
          loadCsv<UpcomingServiceRow>("/data/upcoming_services.csv", "Registration"),
        ]);

        const match = v.find((row) => row.Registration === registration);
        if (!match) {
          throw new Error(`No vehicle found with registration "${registration}".`);
        }

        setVehicle(match);
        setMaintenanceHistory(m.filter((row) => row.Registration === registration));
        setBreakdowns(b.filter((row) => row.Registration === registration));
        setUpcomingServices(us.filter((row) => row.Registration === registration));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load vehicle data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [registration]);

  if (loading) {
    return <div className="vehicledetail-loading">Loading vehicle details…</div>;
  }

  if (error || !vehicle) {
    return (
      <div className="vehicledetail-error">
        <p>{error ?? "Vehicle not found."}</p>
        <Link to="/VehiclesPage" className="back-link">
          <ArrowLeft size={16} /> Back to Fleet
        </Link>
      </div>
    );
  }

  const fuelLevel = Number(vehicle["Fuel Level (%)"] || 0);
  const totalMaintenanceCost = maintenanceHistory.reduce(
    (sum, r) => sum + Number(r["Cost (PKR)"] || 0),
    0
  );
  const totalBreakdownCost = breakdowns.reduce(
    (sum, r) => sum + Number(r["Repair Cost (PKR)"] || 0),
    0
  );

  return (
    <div className="vehicledetail">
      <Link to="/VehiclesPage" className="back-link">
        <ArrowLeft size={16} /> Back to Fleet
      </Link>

      <div className="vehicledetail-header">
        <div className="vehicledetail-header-icon">
          <Car size={28} />
        </div>
        <div>
          <h1 className="vehicledetail-title">{vehicle.Model}</h1>
          <p className="vehicledetail-subtitle">{vehicle.Registration}</p>
        </div>
        <span className={statusBadgeClass[vehicle.Status]}>{vehicle.Status}</span>
      </div>

      
      <div className="detail-card">
        <h3 className="detail-card-title">Vehicle Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label"><Car size={14} /> Registration</span>
            <span className="info-value">{vehicle.Registration}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Car size={14} /> Model</span>
            <span className="info-value">{vehicle.Model}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Calendar size={14} /> Year</span>
            <span className="info-value">{vehicle.Year}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><User size={14} /> Driver</span>
            <span className="info-value">{vehicle.Driver}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Building2 size={14} /> Department</span>
            <span className="info-value">{vehicle.Department}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Gauge size={14} /> Current KM</span>
            <span className="info-value">{Number(vehicle["Current KM"] || 0).toLocaleString()} km</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Fuel size={14} /> Fuel Level</span>
            <span className="info-value">
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
          <div className="info-item">
            <span className="info-label"><Wrench size={14} /> Last Service Date</span>
            <span className="info-value">{formatDate(vehicle["Last Service Date"])}</span>
          </div>
          <div className="info-item">
            <span className="info-label"><Gauge size={14} /> Next Service KM</span>
            <span className="info-value">{Number(vehicle["Next Service KM"] || 0).toLocaleString()} km</span>
          </div>
          <div className="info-item">
            <span className="info-label"><AlertTriangle size={14} /> Status</span>
            <span className="info-value">
              <span className={statusBadgeClass[vehicle.Status]}>{vehicle.Status}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">Maintenance Records</p>
          <h2 className="summary-value">{maintenanceHistory.length}</h2>
          <p className="summary-sub">{formatPKR(totalMaintenanceCost)} total spend</p>
        </div>
        <div className="summary-card">
          <p className="summary-label">Breakdown Records</p>
          <h2 className="summary-value">{breakdowns.length}</h2>
          <p className="summary-sub">{formatPKR(totalBreakdownCost)} repair cost</p>
        </div>
        <div className="summary-card">
          <p className="summary-label">Upcoming Services</p>
          <h2 className="summary-value">{upcomingServices.length}</h2>
          <p className="summary-sub">scheduled</p>
        </div>
      </div>

      <div className="detail-card">
        <h3 className="detail-card-title">
          <Wrench size={16} className="detail-card-title-icon" /> Maintenance History
        </h3>
        {maintenanceHistory.length === 0 ? (
          <p className="empty-note">No maintenance records for this vehicle.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service Type</th>
                <th>Description</th>
                <th>Cost</th>
                <th>Workshop</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceHistory.map((m, i) => (
                <tr key={i}>
                  <td>{formatDate(m.Date)}</td>
                  <td>{m["Service Type"]}</td>
                  <td>{m.Description}</td>
                  <td>{formatPKR(Number(m["Cost (PKR)"] || 0))}</td>
                  <td>{m.Workshop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="detail-card">
        <h3 className="detail-card-title">
          <AlertTriangle size={16} className="detail-card-title-icon" /> Breakdown History
        </h3>
        {breakdowns.length === 0 ? (
          <p className="empty-note">No breakdown records for this vehicle.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Problem</th>
                <th>Downtime</th>
                <th>Repair Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.map((b, i) => (
                <tr key={i}>
                  <td>{formatDate(b.Date)}</td>
                  <td>{b.Problem}</td>
                  <td>{b["Downtime (Hours)"]} hrs</td>
                  <td>{formatPKR(Number(b["Repair Cost (PKR)"] || 0))}</td>
                  <td>
                    <span className="badge badge-active">{b.Status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="detail-card">
        <h3 className="detail-card-title">
          <Clock size={16} className="detail-card-title-icon" /> Upcoming Services
        </h3>
        {upcomingServices.length === 0 ? (
          <p className="empty-note">No upcoming services scheduled for this vehicle.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Due Date</th>
                <th>Due KM</th>
                <th>Service Type</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {upcomingServices.map((s, i) => (
                <tr key={i}>
                  <td>{formatDate(s["Due Date"])}</td>
                  <td>{Number(s["Due KM"] || 0).toLocaleString()} km</td>
                  <td>{s["Service Type"]}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${priorityColor[s.Priority]}1a`,
                        color: priorityColor[s.Priority],
                      }}
                    >
                      {s.Priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}