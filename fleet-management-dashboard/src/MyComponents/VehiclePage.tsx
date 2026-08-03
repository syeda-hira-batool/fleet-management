import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import "./css files/VehiclePage.css";
import {
  Car,
  User,
  Building2,
  Gauge,
  Fuel,
  Calendar,
  Wrench,
  ChevronRight,
  Search,
  FileText,
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

type StatusFilter = "All" | VehicleRow["Status"];

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

const FILTERS: StatusFilter[] = ["All", "Active", "Service Due", "Breakdown"];

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

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

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === "All" || v.Status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = [v.Registration, v.Model, v.Driver, v.Department]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [vehicles, searchQuery, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      All: vehicles.length,
      Active: 0,
      "Service Due": 0,
      Breakdown: 0,
    };
    vehicles.forEach((v) => {
      counts[v.Status] = (counts[v.Status] || 0) + 1;
    });
    return counts;
  }, [vehicles]);

  if (loading) {
    return <div className="vehiclepage-loading">Loading vehicle data…</div>;
  }

  if (error) {
    return <div className="vehiclepage-error">{error}</div>;
  }

  return (
    <div className="vehiclepage">
      <style>{`
        .vp-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          margin: 20px 0 24px;
        }
        .vp-search-box {
          position: relative;
          flex: 1 1 260px;
          min-width: 220px;
        }
        .vp-search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .vp-search-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .vp-search-input:focus {
          border-color: #0D47A1;
        }
        .vp-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .vp-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .vp-filter-chip:hover {
          border-color: #90CAF9;
        }
        .vp-filter-chip.active {
          background: #0D47A1;
          border-color: #0D47A1;
          color: #fff;
        }
        .vp-filter-count {
          font-weight: 700;
          opacity: 0.7;
        }
        .vp-empty-state {
          padding: 48px 16px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
      `}</style>

      <div className="vehiclepage-header">
        <h1 className="vehiclepage-title">Vehicle Fleet</h1>
        <p className="vehiclepage-subtitle">
          Complete details for every vehicle in the fleet — {vehicles.length} total
        </p>
      </div>

      <div className="vp-controls">
        <div className="vp-search-box">
          <Search size={16} />
          <input
            type="text"
            className="vp-search-input"
            placeholder="Search by registration, model, driver, or department…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="vp-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`vp-filter-chip ${statusFilter === f ? "active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
              <span className="vp-filter-count">{filterCounts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="vp-empty-state">
          No vehicles match your search{statusFilter !== "All" ? ` in "${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="vehicle-grid">
          {filteredVehicles.map((v) => {
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

                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    to={`/VehiclesPage/${encodeURIComponent(v.Registration)}`}
                    className="vehicle-card-link"
                    style={{ flex: 1 }}
                  >
                    View Full Details
                    <ChevronRight size={16} />
                  </Link>
                  <Link
                    to={`/ReportPage/${encodeURIComponent(v.Registration)}`}
                    className="vehicle-card-link"
                    style={{ flex: 1 }}
                  >
                    <FileText size={16} />
                    Report
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}