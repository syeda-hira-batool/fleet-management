import { useEffect, useMemo, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import "./css files/AlertsPage.css";
import {
    Search,
    AlertOctagon,
    Wrench,
    Fuel,
    Clock,
    IdCard,
    Bell,
} from "lucide-react";

interface VehicleRow {
    Registration: string;
    Model: string;
    Driver: string;
    Department: string;
    "Current KM": string;
    "Fuel Level (%)": string;
    Status: "Active" | "Service Due" | "Breakdown";
    "Next Service KM": string;
}

interface UpcomingServiceRow {
    Registration: string;
    "Due Date": string;
    "Due KM": string;
    "Service Type": string;
    Priority: "High" | "Medium" | "Low";
}

interface DriverRow {
    Name: string;
    Department: string;
    "Assigned Vehicle": string;
    "License Expiry": string;
}

type Severity = "Critical" | "Warning" | "Info";

interface AlertItem {
    id: string;
    severity: Severity;
    category: string;
    title: string;
    description: string;
    registration?: string;
    icon: JSX.Element;
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
            `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what AlertsPage.tsx expects.`
        );
    }

    return results.data;
}

const formatDate = (value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const daysUntil = (value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const diffMs = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
};

const severityBadgeClass: Record<Severity, string> = {
    Critical: "badge badge-danger",
    Warning: "badge badge-warning",
    Info: "badge badge-info",
};

const SEVERITY_FILTERS: ("All" | Severity)[] = ["All", "Critical", "Warning", "Info"];

export default function AlertsPage() {
    const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingServiceRow[]>([]);
    const [drivers, setDrivers] = useState<DriverRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");

    useEffect(() => {
        async function loadAll() {
            try {
                const [v, us, d] = await Promise.all([
                    loadCsv<VehicleRow>("/data/vehicles.csv", "Registration"),
                    loadCsv<UpcomingServiceRow>("/data/upcoming_services.csv", "Registration"),
                    loadCsv<DriverRow>("/data/drivers.csv", "Name"),
                ]);
                setVehicles(v);
                setUpcoming(us);
                setDrivers(d);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "Failed to load alert data.");
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    }, []);

    const alerts = useMemo<AlertItem[]>(() => {
        const list: AlertItem[] = [];

        vehicles.forEach((v) => {
            const fuel = Number(v["Fuel Level (%)"] || 0);
            const currentKm = Number(v["Current KM"] || 0);
            const nextServiceKm = Number(v["Next Service KM"] || 0);

            if (v.Status === "Breakdown") {
                list.push({
                    id: `breakdown-${v.Registration}`,
                    severity: "Critical",
                    category: "Breakdown",
                    title: `${v.Model} (${v.Registration}) is broken down`,
                    description: `Assigned to ${v.Driver || "no driver"} in ${v.Department}. Needs immediate attention.`,
                    registration: v.Registration,
                    icon: <AlertOctagon size={16} />,
                });
            }

            if (v.Status === "Service Due") {
                list.push({
                    id: `service-due-${v.Registration}`,
                    severity: "Warning",
                    category: "Service Due",
                    title: `${v.Model} (${v.Registration}) is due for service`,
                    description: `Currently at ${currentKm.toLocaleString()} km.`,
                    registration: v.Registration,
                    icon: <Wrench size={16} />,
                });
            }

            if (fuel < 20) {
                list.push({
                    id: `low-fuel-${v.Registration}`,
                    severity: fuel < 10 ? "Critical" : "Warning",
                    category: "Low Fuel",
                    title: `${v.Model} (${v.Registration}) fuel level is ${fuel}%`,
                    description: `Driven by ${v.Driver || "no driver"}. Consider refueling soon.`,
                    registration: v.Registration,
                    icon: <Fuel size={16} />,
                });
            }

            if (v.Status === "Active" && nextServiceKm > 0 && nextServiceKm - currentKm <= 500 && nextServiceKm - currentKm > 0) {
                list.push({
                    id: `approaching-service-${v.Registration}`,
                    severity: "Info",
                    category: "Service Approaching",
                    title: `${v.Model} (${v.Registration}) is nearing its next service`,
                    description: `Only ${(nextServiceKm - currentKm).toLocaleString()} km left until the ${nextServiceKm.toLocaleString()} km service mark.`,
                    registration: v.Registration,
                    icon: <Bell size={16} />,
                });
            }
        });

        upcoming.forEach((u, i) => {
            if (u.Priority === "High") {
                list.push({
                    id: `upcoming-high-${u.Registration}-${i}`,
                    severity: "Warning",
                    category: "Upcoming Service",
                    title: `${u["Service Type"]} due for ${u.Registration}`,
                    description: `Due ${formatDate(u["Due Date"])} at ${Number(u["Due KM"] || 0).toLocaleString()} km — flagged high priority.`,
                    registration: u.Registration,
                    icon: <Clock size={16} />,
                });
            } else if (u.Priority === "Medium" || u.Priority === "Low") {
                list.push({
                    id: `upcoming-${u.Priority.toLowerCase()}-${u.Registration}-${i}`,
                    severity: "Info",
                    category: "Upcoming Service",
                    title: `${u["Service Type"]} scheduled for ${u.Registration}`,
                    description: `Due ${formatDate(u["Due Date"])} at ${Number(u["Due KM"] || 0).toLocaleString()} km — ${u.Priority.toLowerCase()} priority, plan ahead.`,
                    registration: u.Registration,
                    icon: <Clock size={16} />,
                });
            }
        });

        drivers.forEach((d, i) => {
            if (!d["License Expiry"]) return;
            const days = daysUntil(d["License Expiry"]);
            if (days === null) return;

            if (days < 0) {
                list.push({
                    id: `license-expired-${i}`,
                    severity: "Critical",
                    category: "License Expired",
                    title: `${d.Name}'s license has expired`,
                    description: `Expired on ${formatDate(d["License Expiry"])}. ${d.Department} department.`,
                    icon: <IdCard size={16} />,
                });
            } else if (days <= 30) {
                list.push({
                    id: `license-expiring-${i}`,
                    severity: "Warning",
                    category: "License Expiring",
                    title: `${d.Name}'s license expires in ${days} day${days === 1 ? "" : "s"}`,
                    description: `Expires ${formatDate(d["License Expiry"])}. ${d.Department} department.`,
                    icon: <IdCard size={16} />,
                });
            } else if (days <= 60) {
                list.push({
                    id: `license-expiring-soon-${i}`,
                    severity: "Info",
                    category: "License Expiring Soon",
                    title: `${d.Name}'s license expires in ${days} days`,
                    description: `Expires ${formatDate(d["License Expiry"])}. ${d.Department} department — renewal not urgent yet.`,
                    icon: <IdCard size={16} />,
                });
            }
        });

        const severityRank: Record<Severity, number> = { Critical: 0, Warning: 1, Info: 2 };
        return list.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    }, [vehicles, upcoming, drivers]);

    const counts = useMemo(() => {
        const c: Record<"All" | Severity, number> = { All: alerts.length, Critical: 0, Warning: 0, Info: 0 };
        alerts.forEach((a) => {
            c[a.severity] += 1;
        });
        return c;
    }, [alerts]);

    const filteredAlerts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return alerts.filter((a) => {
            const matchesSeverity = severityFilter === "All" || a.severity === severityFilter;
            if (!matchesSeverity) return false;
            if (!q) return true;
            const haystack = [a.title, a.description, a.category, a.registration ?? ""].join(" ").toLowerCase();
            return haystack.includes(q);
        });
    }, [alerts, searchQuery, severityFilter]);

    if (loading) {
        return <div className="alertspage-loading">Loading alerts…</div>;
    }

    if (error) {
        return <div className="alertspage-error">{error}</div>;
    }

    return (
        <div className="alertspage">
            <div className="alertspage-header">
                <h1 className="alertspage-title">Alerts</h1>
                <p className="alertspage-subtitle">
                    Everything in your fleet that needs attention right now — {alerts.length} active
                </p>
            </div>

            <div className="ap-summary-grid">
                <div className="ap-summary-card ap-summary-critical">
                    <p className="ap-summary-label">Critical</p>
                    <h2 className="ap-summary-value">{counts.Critical}</h2>
                </div>
                <div className="ap-summary-card ap-summary-warning">
                    <p className="ap-summary-label">Warning</p>
                    <h2 className="ap-summary-value">{counts.Warning}</h2>
                </div>
                <div className="ap-summary-card ap-summary-info">
                    <p className="ap-summary-label">Info</p>
                    <h2 className="ap-summary-value">{counts.Info}</h2>
                </div>
            </div>

            <div className="ap-controls">
                <div className="ap-search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        className="ap-search-input"
                        placeholder="Search alerts by vehicle, driver, or category…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="ap-filters">
                    {SEVERITY_FILTERS.map((f) => (
                        <button
                            key={f}
                            type="button"
                            className={`ap-filter-chip ap-filter-chip-${f.toLowerCase()} ${severityFilter === f ? "active" : ""}`}
                            onClick={() => setSeverityFilter(f)}
                        >
                            {f}
                            <span className="ap-filter-count">{counts[f]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {filteredAlerts.length === 0 ? (
                <div className="ap-empty-state">
                    {alerts.length === 0
                        ? "No active alerts — the fleet is in good shape."
                        : "No alerts match your search."}
                </div>
            ) : (
                <div className="alert-list">
                    {filteredAlerts.map((a) => (
                        <div className={`alert-card alert-card-${a.severity.toLowerCase()}`} key={a.id}>
                            <span className="alert-card-icon">{a.icon}</span>
                            <div className="alert-card-body">
                                <div className="alert-card-top">
                                    <span className="alert-card-category">{a.category}</span>
                                    <span className={severityBadgeClass[a.severity]}>{a.severity}</span>
                                </div>
                                <h3 className="alert-card-title">{a.title}</h3>
                                <p className="alert-card-desc">{a.description}</p>
                            </div>
                            {a.registration && (
                                <Link to={`/VehiclesPage/${encodeURIComponent(a.registration)}`} className="alert-card-link">
                                    View Vehicle
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}