import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./HomePage.css";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Car,
  AlertTriangle,
  Wrench,
  Fuel,
  TrendingUp,
  Calendar,
} from "lucide-react";

/*  Types matching the CSV column headers     */

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

interface MonthlyCostRow {
  Month: string;
  "Cost (PKR)": string;
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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what HomePage.tsx expects.`
    );
  }

  return results.data;
}

const formatPKR = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;

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

export default function HomePage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
  const [monthlyCost, setMonthlyCost] = useState<MonthlyCostRow[]>([]);
  const [upcomingServices, setUpcomingServices] = useState<UpcomingServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [v, m, b, mc, us] = await Promise.all([
          loadCsv<VehicleRow>("/data/vehicles.csv", "Registration"),
          loadCsv<MaintenanceRow>("/data/maintenance.csv", "Registration"),
          loadCsv<BreakdownRow>("/data/breakdowns.csv", "Registration"),
          loadCsv<MonthlyCostRow>("/data/monthly_cost.csv", "Month"),
          loadCsv<UpcomingServiceRow>("/data/upcoming_services.csv", "Registration"),
        ]);
        setVehicles(v);
        setMaintenanceHistory(m);
        setBreakdowns(b);
        setMonthlyCost(mc);
        setUpcomingServices(us);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load fleet data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  if (loading) {
    return <div className="homepage-loading">Loading fleet data…</div>;
  }

  if (error) {
    return <div className="homepage-error">{error}</div>;
  }

  const totalVehicles = vehicles.length;
  const activeCount = vehicles.filter((v) => v.Status === "Active").length;
  const serviceDueCount = vehicles.filter((v) => v.Status === "Service Due").length;
  const breakdownCount = vehicles.filter((v) => v.Status === "Breakdown").length;

  const totalMaintenanceCost = maintenanceHistory.reduce(
    (sum, r) => sum + Number(r["Cost (PKR)"] || 0),
    0
  );
  const totalBreakdownCost = breakdowns.reduce(
    (sum, r) => sum + Number(r["Repair Cost (PKR)"] || 0),
    0
  );
  const avgFuelLevel = vehicles.length
    ? Math.round(
        vehicles.reduce((sum, v) => sum + Number(v["Fuel Level (%)"] || 0), 0) /
          vehicles.length
      )
    : 0;

  const statusData = [
    { name: "Active", value: activeCount, color: "#22c55e" },
    { name: "Service Due", value: serviceDueCount, color: "#f59e0b" },
    { name: "Breakdown", value: breakdownCount, color: "#ef4444" },
  ];

  const departmentMap: Record<string, number> = {};
  vehicles.forEach((v) => {
    departmentMap[v.Department] = (departmentMap[v.Department] || 0) + 1;
  });
  const departmentData = Object.entries(departmentMap).map(([name, value]) => ({
    name,
    value,
  }));

  const monthlyCostData = monthlyCost.map((row) => ({
    month: row.Month.slice(0, 3),
    cost: Number(row["Cost (PKR)"] || 0),
  }));

  return (
    <div className="homepage">
      <div className="homepage-header">
        <div>
          <h1 className="homepage-title">Fleet Overview</h1>
          <p className="homepage-subtitle">
            Live summary of your vehicles, maintenance and costs
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Car size={22} />
          </div>
          <div>
            <p className="stat-label">Total Vehicles</p>
            <h2 className="stat-value">{totalVehicles}</h2>
            <p className="stat-sub">{activeCount} active</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <Wrench size={22} />
          </div>
          <div>
            <p className="stat-label">Service Due</p>
            <h2 className="stat-value">{serviceDueCount}</h2>
            <p className="stat-sub">{upcomingServices.length} upcoming</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="stat-label">Breakdowns</p>
            <h2 className="stat-value">{breakdownCount}</h2>
            <p className="stat-sub">{formatPKR(totalBreakdownCost)} repair cost</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <Fuel size={22} />
          </div>
          <div>
            <p className="stat-label">Avg Fuel Level</p>
            <h2 className="stat-value">{avgFuelLevel}%</h2>
            <p className="stat-sub">across fleet</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="stat-label">Maintenance Spend</p>
            <h2 className="stat-value">{formatPKR(totalMaintenanceCost)}</h2>
            <p className="stat-sub">to date</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">Monthly Maintenance Cost</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(value) => formatPKR(Number((value)))}
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#276F27"
                strokeWidth={3}
                dot={{ r: 4, fill: "#276F27" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Fleet Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={30} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Vehicles by Department</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="value" fill="#276F27" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">Recent Breakdowns</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Problem</th>
                <th>Downtime</th>
                <th>Repair Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.map((b, i) => (
                <tr key={i}>
                  <td>{b.Registration}</td>
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
        </div>
      </div>

      <div className="table-card">
        <h3 className="chart-title">Vehicle Fleet</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Model</th>
              <th>Year</th>
              <th>Driver</th>
              <th>Department</th>
              <th>Current KM</th>
              <th>Fuel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const fuelLevel = Number(v["Fuel Level (%)"] || 0);
              return (
                <tr key={v.Registration}>
                  <td className="font-medium">{v.Registration}</td>
                  <td>{v.Model}</td>
                  <td>{v.Year}</td>
                  <td>{v.Driver}</td>
                  <td>{v.Department}</td>
                  <td>{Number(v["Current KM"]).toLocaleString()} km</td>
                  <td>
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
                  </td>
                  <td>
                    <span className={statusBadgeClass[v.Status]}>{v.Status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="chart-title-row">
          <h3 className="chart-title">
            <Calendar size={18} className="chart-title-icon" />
            Upcoming Services
          </h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Due Date</th>
              <th>Due KM</th>
              <th>Service Type</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {upcomingServices.map((s, i) => (
              <tr key={i}>
                <td className="font-medium">{s.Registration}</td>
                <td>
                  {new Date(s["Due Date"]).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>{Number(s["Due KM"]).toLocaleString()} km</td>
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
      </div>
    </div>
  );
}