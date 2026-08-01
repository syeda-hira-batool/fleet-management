import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import "./MaintenancePage.css";
import {
  Wrench,
  Search,
  Car,
  Building2,
  Clock,
  AlertTriangle,
  Banknote,
  ListChecks,
  Gauge,
} from "lucide-react";

interface VehicleRow {
  Registration: string;
  Model: string;
}

interface MaintenanceRow {
  Registration: string;
  Date: string;
  "Service Type": string;
  Description: string;
  "Cost (PKR)": string;
  Workshop: string;
}

interface UpcomingServiceRow {
  Registration: string;
  "Due Date": string;
  "Due KM": string;
  "Service Type": string;
  Priority: "High" | "Medium" | "Low";
}

type PriorityFilter = "All" | UpcomingServiceRow["Priority"];

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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what MaintenancePage.tsx expects.`
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

const priorityBadgeClass: Record<UpcomingServiceRow["Priority"], string> = {
  High: "badge badge-danger",
  Medium: "badge badge-warning",
  Low: "badge badge-active",
};

const PRIORITY_FILTERS: PriorityFilter[] = ["All", "High", "Medium", "Low"];

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("All");

  const [upcomingSearch, setUpcomingSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");

  useEffect(() => {
    async function loadAll() {
      try {
        const [v, m, us] = await Promise.all([
          loadCsv<VehicleRow>("/data/vehicles.csv", "Registration"),
          loadCsv<MaintenanceRow>("/data/maintenance.csv", "Registration"),
          loadCsv<UpcomingServiceRow>("/data/upcoming_services.csv", "Registration"),
        ]);
        setVehicles(v);
        setMaintenance(m);
        setUpcoming(us);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load maintenance data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const vehicleModelMap = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v) => {
      map[v.Registration] = v.Model;
    });
    return map;
  }, [vehicles]);


  const serviceTypes = useMemo(() => {
    const set = new Set<string>();
    maintenance.forEach((m) => {
      if (m["Service Type"]) set.add(m["Service Type"]);
    });
    return Array.from(set).sort();
  }, [maintenance]);

  const historyFilters = useMemo(() => ["All", ...serviceTypes], [serviceTypes]);

  const historyCounts = useMemo(() => {
    const counts: Record<string, number> = { All: maintenance.length };
    maintenance.forEach((m) => {
      const t = m["Service Type"] || "Other";
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [maintenance]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return maintenance
      .filter((m) => serviceTypeFilter === "All" || m["Service Type"] === serviceTypeFilter)
      .filter((m) => {
        if (!q) return true;
        const haystack = [
          m.Registration,
          vehicleModelMap[m.Registration] ?? "",
          m["Service Type"],
          m.Description,
          m.Workshop,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  }, [maintenance, historySearch, serviceTypeFilter, vehicleModelMap]);


  const priorityCounts = useMemo(() => {
    const counts: Record<PriorityFilter, number> = { All: upcoming.length, High: 0, Medium: 0, Low: 0 };
    upcoming.forEach((u) => {
      counts[u.Priority] = (counts[u.Priority] || 0) + 1;
    });
    return counts;
  }, [upcoming]);

  const filteredUpcoming = useMemo(() => {
    const q = upcomingSearch.trim().toLowerCase();
    return upcoming
      .filter((u) => priorityFilter === "All" || u.Priority === priorityFilter)
      .filter((u) => {
        if (!q) return true;
        const haystack = [u.Registration, vehicleModelMap[u.Registration] ?? "", u["Service Type"]]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(a["Due Date"]).getTime() - new Date(b["Due Date"]).getTime());
  }, [upcoming, upcomingSearch, priorityFilter, vehicleModelMap]);


  const totalSpend = maintenance.reduce((sum, r) => sum + Number(r["Cost (PKR)"] || 0), 0);
  const avgCost = maintenance.length > 0 ? totalSpend / maintenance.length : 0;
  const vehiclesServiced = new Set(maintenance.map((m) => m.Registration)).size;
  const highPriorityDue = upcoming.filter((u) => u.Priority === "High").length;

  if (loading) {
    return <div className="maintenancepage-loading">Loading maintenance data…</div>;
  }

  if (error) {
    return <div className="maintenancepage-error">{error}</div>;
  }

  return (
    <div className="maintenancepage">
      <div className="maintenancepage-header">
        <h1 className="maintenancepage-title text-center">Maintenance</h1>
        <p className="maintenancepage-subtitle text-center">
          Fleet-wide service history and upcoming maintenance schedule
        </p>
      </div>

      <div className="mp-summary-grid">
        <div className="mp-summary-card">
          <span className="mp-summary-icon"><Wrench size={18} /></span>
          <p className="mp-summary-label">Service Records</p>
          <h2 className="mp-summary-value">{maintenance.length}</h2>
        </div>
        <div className="mp-summary-card">
          <span className="mp-summary-icon"><Banknote size={18} /></span>
          <p className="mp-summary-label">Total Spend</p>
          <h2 className="mp-summary-value">{formatPKR(totalSpend)}</h2>
        </div>
        <div className="mp-summary-card">
          <span className="mp-summary-icon"><Gauge size={18} /></span>
          <p className="mp-summary-label">Avg. Cost / Service</p>
          <h2 className="mp-summary-value">{formatPKR(Math.round(avgCost))}</h2>
        </div>
        <div className="mp-summary-card">
          <span className="mp-summary-icon"><Car size={18} /></span>
          <p className="mp-summary-label">Vehicles Serviced</p>
          <h2 className="mp-summary-value">{vehiclesServiced}</h2>
        </div>
        <div className="mp-summary-card mp-summary-card-alert">
          <span className="mp-summary-icon"><AlertTriangle size={18} /></span>
          <p className="mp-summary-label">High Priority Due</p>
          <h2 className="mp-summary-value">{highPriorityDue}</h2>
        </div>
      </div>

      <section className="mp-section">
        <div className="mp-section-header">
          <h3><Clock size={16} /> Upcoming Services</h3>
        </div>

        <div className="mp-controls">
          <div className="mp-search-box">
            <Search size={16} />
            <input
              type="text"
              className="mp-search-input"
              placeholder="Search upcoming services by vehicle, model, or service type…"
              value={upcomingSearch}
              onChange={(e) => setUpcomingSearch(e.target.value)}
            />
          </div>
          <div className="mp-filters">
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`mp-filter-chip ${priorityFilter === f ? "active" : ""}`}
                onClick={() => setPriorityFilter(f)}
              >
                {f}
                <span className="mp-filter-count">{priorityCounts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredUpcoming.length === 0 ? (
          <p className="mp-empty-note">No upcoming services match your search.</p>
        ) : (
          <div className="mp-table-wrapper">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Due Date</th>
                  <th>Due KM</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpcoming.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <Link to={`/VehiclesPage/${encodeURIComponent(u.Registration)}`} className="mp-vehicle-link">
                        {u.Registration}
                      </Link>
                      <span className="mp-vehicle-model"> · {vehicleModelMap[u.Registration] ?? "—"}</span>
                    </td>
                    <td>{u["Service Type"]}</td>
                    <td>{formatDate(u["Due Date"])}</td>
                    <td>{Number(u["Due KM"] || 0).toLocaleString()} km</td>
                    <td><span className={priorityBadgeClass[u.Priority]}>{u.Priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mp-section">
        <div className="mp-section-header">
          <h3><ListChecks size={16} /> Maintenance History</h3>
        </div>

        <div className="mp-controls">
          <div className="mp-search-box">
            <Search size={16} />
            <input
              type="text"
              className="mp-search-input"
              placeholder="Search by vehicle, model, service type, description, or workshop…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
          <div className="mp-filters">
            {historyFilters.map((f) => (
              <button
                key={f}
                type="button"
                className={`mp-filter-chip ${serviceTypeFilter === f ? "active" : ""}`}
                onClick={() => setServiceTypeFilter(f)}
              >
                {f}
                <span className="mp-filter-count">{historyCounts[f] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="mp-empty-note">No maintenance records match your search.</p>
        ) : (
          <div className="mp-table-wrapper">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th><Building2 size={13} /> Workshop</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((m, i) => (
                  <tr key={i}>
                    <td>{formatDate(m.Date)}</td>
                    <td>
                      <Link to={`/VehiclesPage/${encodeURIComponent(m.Registration)}`} className="mp-vehicle-link">
                        {m.Registration}
                      </Link>
                      <span className="mp-vehicle-model"> · {vehicleModelMap[m.Registration] ?? "—"}</span>
                    </td>
                    <td>{m["Service Type"]}</td>
                    <td>{m.Description}</td>
                    <td>{formatPKR(Number(m["Cost (PKR)"] || 0))}</td>
                    <td>{m.Workshop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}