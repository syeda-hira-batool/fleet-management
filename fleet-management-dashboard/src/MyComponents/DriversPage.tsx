import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import "./css files/DriversPage.css";
import {
  User,
  Phone,
  Building2,
  IdCard,
  Car,
  CalendarClock,
  CalendarCheck,
  Search,
} from "lucide-react";

interface DriverRow {
  "Driver ID": string;
  Name: string;
  "License Number": string;
  Phone: string;
  Department: string;
  "Assigned Vehicle": string;
  Status: "Active" | "On Leave" | "Inactive";
  "License Expiry": string;
  "Joined Date": string;
}

type StatusFilter = "All" | DriverRow["Status"];

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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what DriversPage.tsx expects.`
    );
  }

  return results.data;
}

const formatDate = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusBadgeClass: Record<DriverRow["Status"], string> = {
  Active: "badge badge-active",
  "On Leave": "badge badge-warning",
  Inactive: "badge badge-danger",
};

const FILTERS: StatusFilter[] = ["All", "Active", "On Leave", "Inactive"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    async function loadAll() {
      try {
        const d = await loadCsv<DriverRow>("/data/drivers.csv", "Driver ID");
        setDrivers(d);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load driver data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drivers.filter((d) => {
      const matchesStatus = statusFilter === "All" || d.Status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = [d.Name, d["License Number"], d.Department, d["Assigned Vehicle"], d.Phone]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [drivers, searchQuery, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      All: drivers.length,
      Active: 0,
      "On Leave": 0,
      Inactive: 0,
    };
    drivers.forEach((d) => {
      counts[d.Status] = (counts[d.Status] || 0) + 1;
    });
    return counts;
  }, [drivers]);

  if (loading) {
    return <div className="driverspage-loading">Loading driver data…</div>;
  }

  if (error) {
    return <div className="driverspage-error">{error}</div>;
  }

  return (
    <div className="driverspage">
      <div className="driverspage-header">
        <h1 className="driverspage-title text-center">Drivers</h1>
        <p className="driverspage-subtitle text-center">
          Complete information for every driver in the fleet — {drivers.length} total
        </p>
      </div>

      <div className="dp-controls">
        <div className="dp-search-box">
          <Search size={16} />
          <input
            type="text"
            className="dp-search-input"
            placeholder="Search by name, license number, department, or vehicle…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="dp-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`dp-filter-chip ${statusFilter === f ? "active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
              <span className="dp-filter-count">{filterCounts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="dp-empty-state">
          No drivers match your search{statusFilter !== "All" ? ` in "${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="driver-grid">
          {filteredDrivers.map((d) => (
            <div className="driver-card" key={d["Driver ID"]}>
              <div className="driver-card-top">
                <div className="driver-card-avatar">{initials(d.Name) || <User size={20} />}</div>
                <div>
                  <h2 className="driver-card-name">{d.Name}</h2>
                  <p className="driver-card-id">{d["Driver ID"]}</p>
                </div>
                <span className={statusBadgeClass[d.Status]}>{d.Status}</span>
              </div>

              <div className="driver-card-details">
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <IdCard size={14} /> License No.
                  </span>
                  <span className="driver-detail-value">{d["License Number"]}</span>
                </div>
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <Phone size={14} /> Phone
                  </span>
                  <span className="driver-detail-value">{d.Phone}</span>
                </div>
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <Building2 size={14} /> Department
                  </span>
                  <span className="driver-detail-value">{d.Department}</span>
                </div>
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <Car size={14} /> Assigned Vehicle
                  </span>
                  <span className="driver-detail-value">
                    {d["Assigned Vehicle"] ? (
                      <Link
                        to={`/VehiclesPage/${encodeURIComponent(d["Assigned Vehicle"])}`}
                        className="driver-vehicle-link"
                      >
                        {d["Assigned Vehicle"]}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <CalendarClock size={14} /> License Expiry
                  </span>
                  <span className="driver-detail-value">{formatDate(d["License Expiry"])}</span>
                </div>
                <div className="driver-detail-row">
                  <span className="driver-detail-label">
                    <CalendarCheck size={14} /> Joined
                  </span>
                  <span className="driver-detail-value">{formatDate(d["Joined Date"])}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}