import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./css files/AnalyticsPage.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Car,
  Users,
  Banknote,
  Fuel,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

interface VehicleRow {
  Registration: string;
  Model: string;
  Department: string;
  "Fuel Level (%)": string;
  Status: "Active" | "Service Due" | "Breakdown";
}

interface MaintenanceRow {
  Registration: string;
  Date: string;
  "Cost (PKR)": string;
}

interface BreakdownRow {
  Registration: string;
  Date: string;
  "Repair Cost (PKR)": string;
}

interface UpcomingServiceRow {
  Registration: string;
  Priority: "High" | "Medium" | "Low";
}

interface DriverRow {
  Name: string;
  Status: "Active" | "On Leave" | "Inactive";
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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what AnalyticsPage.tsx expects.`
    );
  }

  return results.data;
}

const formatPKR = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;

const STATUS_COLORS: Record<string, string> = {
  Active: "#16a34a",
  "Service Due": "#b45309",
  Breakdown: "#dc2626",
  "On Leave": "#b45309",
  Inactive: "#dc2626",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "#dc2626",
  Medium: "#b45309",
  Low: "#16a34a",
};

/** Optional: this file, drop it in /public/data/ to see real data instead of skeleton empty states. */
export default function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingServiceRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [v, m, b, us, d] = await Promise.all([
          loadCsv<VehicleRow>("/data/vehicles.csv", "Registration"),
          loadCsv<MaintenanceRow>("/data/maintenance.csv", "Registration"),
          loadCsv<BreakdownRow>("/data/breakdowns.csv", "Registration"),
          loadCsv<UpcomingServiceRow>("/data/upcoming_services.csv", "Registration"),
          loadCsv<DriverRow>("/data/drivers.csv", "Name"),
        ]);
        setVehicles(v);
        setMaintenance(m);
        setBreakdowns(b);
        setUpcoming(us);
        setDrivers(d);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);


  const totalMaintenanceSpend = maintenance.reduce((s, r) => s + Number(r["Cost (PKR)"] || 0), 0);
  const totalBreakdownSpend = breakdowns.reduce((s, r) => s + Number(r["Repair Cost (PKR)"] || 0), 0);
  const avgFuelLevel =
    vehicles.length > 0
      ? Math.round(vehicles.reduce((s, v) => s + Number(v["Fuel Level (%)"] || 0), 0) / vehicles.length)
      : 0;
  const highPriorityDue = upcoming.filter((u) => u.Priority === "High").length;


  const fleetStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v) => {
      counts[v.Status] = (counts[v.Status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vehicles]);


  const monthlySpendData = useMemo(() => {
    const totals: Record<string, number> = {};
    maintenance.forEach((m) => {
      const d = new Date(m.Date);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      totals[key] = (totals[key] || 0) + Number(m["Cost (PKR)"] || 0);
    });
    return Object.entries(totals)
      .map(([month, spend]) => ({ month, spend, sortKey: new Date(month).getTime() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ month, spend }) => ({ month, spend }));
  }, [maintenance]);


  const topCostVehicles = useMemo(() => {
    const totals: Record<string, number> = {};
    maintenance.forEach((m) => {
      totals[m.Registration] = (totals[m.Registration] || 0) + Number(m["Cost (PKR)"] || 0);
    });
    breakdowns.forEach((b) => {
      totals[b.Registration] = (totals[b.Registration] || 0) + Number(b["Repair Cost (PKR)"] || 0);
    });
    return Object.entries(totals)
      .map(([registration, cost]) => ({ registration, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [maintenance, breakdowns]);


  const breakdownsByDept = useMemo(() => {
    const deptMap: Record<string, string> = {};
    vehicles.forEach((v) => {
      deptMap[v.Registration] = v.Department;
    });
    const counts: Record<string, number> = {};
    breakdowns.forEach((b) => {
      const dept = deptMap[b.Registration] ?? "Unknown";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([department, incidents]) => ({ department, incidents }));
  }, [breakdowns, vehicles]);


  const driverStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    drivers.forEach((d) => {
      counts[d.Status] = (counts[d.Status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [drivers]);

  const upcomingByPriority = useMemo(() => {
    const order: UpcomingServiceRow["Priority"][] = ["High", "Medium", "Low"];
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    upcoming.forEach((u) => {
      counts[u.Priority] = (counts[u.Priority] || 0) + 1;
    });
    return order.map((priority) => ({ priority, count: counts[priority] }));
  }, [upcoming]);

  if (loading) {
    return <div className="analyticspage-loading">Loading analytics…</div>;
  }

  if (error) {
    return <div className="analyticspage-error">{error}</div>;
  }

  return (
    <div className="analyticspage">
      <div className="analyticspage-header">
        <h1 className="analyticspage-title text-center">Analytics</h1>
        <p className="analyticspage-subtitle text-center">
          Fleet performance, spend trends, and risk at a glance
        </p>
      </div>

      <div className="ap-kpi-grid">
        <div className="ap-kpi-card">
          <span className="ap-kpi-icon"><Car size={18} /></span>
          <p className="ap-kpi-label">Total Vehicles</p>
          <h2 className="ap-kpi-value">{vehicles.length}</h2>
        </div>
        <div className="ap-kpi-card">
          <span className="ap-kpi-icon"><Users size={18} /></span>
          <p className="ap-kpi-label">Total Drivers</p>
          <h2 className="ap-kpi-value">{drivers.length}</h2>
        </div>
        <div className="ap-kpi-card">
          <span className="ap-kpi-icon"><Banknote size={18} /></span>
          <p className="ap-kpi-label">Maintenance Spend</p>
          <h2 className="ap-kpi-value">{formatPKR(totalMaintenanceSpend)}</h2>
        </div>
        <div className="ap-kpi-card">
          <span className="ap-kpi-icon"><AlertTriangle size={18} /></span>
          <p className="ap-kpi-label">Breakdown Spend</p>
          <h2 className="ap-kpi-value">{formatPKR(totalBreakdownSpend)}</h2>
        </div>
        <div className="ap-kpi-card">
          <span className="ap-kpi-icon"><Fuel size={18} /></span>
          <p className="ap-kpi-label">Avg. Fuel Level</p>
          <h2 className="ap-kpi-value">{avgFuelLevel}%</h2>
        </div>
        <div className="ap-kpi-card ap-kpi-card-alert">
          <span className="ap-kpi-icon"><AlertTriangle size={18} /></span>
          <p className="ap-kpi-label">High Priority Due</p>
          <h2 className="ap-kpi-value">{highPriorityDue}</h2>
        </div>
      </div>

      <div className="ap-chart-grid">
        <div className="ap-chart-card">
          <h3><PieChartIcon size={16} /> Fleet Status Breakdown</h3>
          {fleetStatusData.length === 0 ? (
            <p className="ap-empty-note">No vehicle data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {fleetStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6366f1"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ap-chart-card">
          <h3><BarChart3 size={16} /> Monthly Maintenance Spend</h3>
          {monthlySpendData.length === 0 ? (
            <p className="ap-empty-note">No maintenance records available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySpendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatPKR(value as number)} />
                <Bar dataKey="spend" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ap-chart-card">
          <h3><BarChart3 size={16} /> Top 5 Costliest Vehicles</h3>
          {topCostVehicles.length === 0 ? (
            <p className="ap-empty-note">No cost data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCostVehicles} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="registration" tick={{ fontSize: 12 }} width={90} />
                <Tooltip formatter={(value) => formatPKR(value as number)} />
                <Bar dataKey="cost" fill="#dc2626" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ap-chart-card">
          <h3><BarChart3 size={16} /> Breakdowns by Department</h3>
          {breakdownsByDept.length === 0 ? (
            <p className="ap-empty-note">No breakdown records available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={breakdownsByDept}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="incidents" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ap-chart-card">
          <h3><PieChartIcon size={16} /> Driver Status Breakdown</h3>
          {driverStatusData.length === 0 ? (
            <p className="ap-empty-note">No driver data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={driverStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {driverStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6366f1"} />
                    /* cell helps color */
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ap-chart-card">
          <h3><BarChart3 size={16} /> Upcoming Services by Priority</h3>
          {upcoming.length === 0 ? (
            <p className="ap-empty-note">No upcoming services scheduled.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={upcomingByPriority}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {upcomingByPriority.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}