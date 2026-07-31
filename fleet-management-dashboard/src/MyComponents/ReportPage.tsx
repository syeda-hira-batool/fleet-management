import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Papa from "papaparse";
import "./ReportPage.css";
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
  Download,
  Printer,
  FileText,
} from "lucide-react";

/*  Types matching the CSV column headers  */
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
      `${path} was loaded but doesn't contain the expected "${requiredColumn}" column. Check the CSV headers match what ReportPage.tsx expects.`
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

/** Escapes a value for safe inclusion in a CSV cell. */
function csvCell(value: string | number): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export default function ReportPage() {
  const { registration } = useParams<{ registration: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [allVehicles, setAllVehicles] = useState<VehicleRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [breakdownsAll, setBreakdownsAll] = useState<BreakdownRow[]>([]);
  const [upcomingAll, setUpcomingAll] = useState<UpcomingServiceRow[]>([]);
  const [selectedReg, setSelectedReg] = useState<string>(registration ?? "");
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
        setAllVehicles(v);
        setMaintenance(m);
        setBreakdownsAll(b);
        setUpcomingAll(us);

        if (!registration && v.length > 0) {
          setSelectedReg(v[0].Registration);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load vehicle data.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (registration) setSelectedReg(registration);
  }, [registration]);

  const vehicle = useMemo(
    () => allVehicles.find((v) => v.Registration === selectedReg) ?? null,
    [allVehicles, selectedReg]
  );
  const maintenanceHistory = useMemo(
    () => maintenance.filter((r) => r.Registration === selectedReg),
    [maintenance, selectedReg]
  );
  const breakdowns = useMemo(
    () => breakdownsAll.filter((r) => r.Registration === selectedReg),
    [breakdownsAll, selectedReg]
  );
  const upcomingServices = useMemo(
    () => upcomingAll.filter((r) => r.Registration === selectedReg),
    [upcomingAll, selectedReg]
  );

  const totalMaintenanceCost = maintenanceHistory.reduce(
    (sum, r) => sum + Number(r["Cost (PKR)"] || 0),
    0
  );
  const totalBreakdownCost = breakdowns.reduce(
    (sum, r) => sum + Number(r["Repair Cost (PKR)"] || 0),
    0
  );

  function handleSelect(reg: string) {
    setSelectedReg(reg);
    navigate(`/ReportPage/${encodeURIComponent(reg)}`, { replace: true });
  }

  function handleDownloadPDF() {
    if (!printRef.current || !vehicle) return;
    const printWindow = window.open("", "_blank", "width=1000,height=1300");
    if (!printWindow) return;

    const styles = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Segoe UI, Arial, sans-serif; padding: 36px; color: #111827; }
        h1 { font-size: 22px; margin: 0; }
        h2, h3 { margin: 0 0 10px; }
        .report-print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 22px; }
        .report-print-header p { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
        .report-print-section { margin-bottom: 26px; page-break-inside: avoid; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; }
        .info-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; font-size: 13px; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 7px 10px; text-align: left; font-size: 12.5px; }
        th { background: #f9fafb; font-weight: 700; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .badge-active { background: #dcfce7; color: #16a34a; }
        .badge-warning { background: #fef3c7; color: #b45309; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .summary-row { display: flex; gap: 24px; margin-bottom: 22px; }
        .summary-box { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
        .summary-box p { margin: 0; font-size: 12px; color: #6b7280; }
        .summary-box h3 { font-size: 20px; margin: 4px 0 0; }
        .empty-note { color: #9ca3af; font-size: 13px; font-style: italic; }
        @media print { body { padding: 16px; } }
      </style>
    `;

    printWindow.document.write(
      `<html><head><title>Vehicle Report - ${vehicle.Registration}</title>${styles}</head><body>${printRef.current.innerHTML}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  }

  function handleDownloadCSV() {
    if (!vehicle) return;
    const rows: string[] = [];

    rows.push([csvCell("Vehicle Report"), csvCell(vehicle.Registration)].join(","));
    rows.push([csvCell("Generated"), csvCell(new Date().toLocaleString("en-GB"))].join(","));
    rows.push("");

    rows.push(csvCell("Vehicle Information"));
    rows.push([csvCell("Field"), csvCell("Value")].join(","));
    const infoPairs: [string, string][] = [
      ["Registration", vehicle.Registration],
      ["Model", vehicle.Model],
      ["Year", vehicle.Year],
      ["Driver", vehicle.Driver],
      ["Department", vehicle.Department],
      ["Current KM", vehicle["Current KM"]],
      ["Fuel Level (%)", vehicle["Fuel Level (%)"]],
      ["Status", vehicle.Status],
      ["Last Service Date", formatDate(vehicle["Last Service Date"])],
      ["Next Service KM", vehicle["Next Service KM"]],
    ];
    infoPairs.forEach(([k, v]) => rows.push([csvCell(k), csvCell(v)].join(",")));
    rows.push("");

    rows.push(csvCell(`Maintenance History (Total: ${formatPKR(totalMaintenanceCost)})`));
    rows.push(
      [csvCell("Date"), csvCell("Service Type"), csvCell("Description"), csvCell("Cost (PKR)"), csvCell("Workshop")].join(",")
    );
    maintenanceHistory.forEach((m) =>
      rows.push(
        [
          csvCell(formatDate(m.Date)),
          csvCell(m["Service Type"]),
          csvCell(m.Description),
          csvCell(m["Cost (PKR)"]),
          csvCell(m.Workshop),
        ].join(",")
      )
    );
    rows.push("");

    rows.push(csvCell(`Breakdown History (Total repair cost: ${formatPKR(totalBreakdownCost)})`));
    rows.push(
      [csvCell("Date"), csvCell("Problem"), csvCell("Downtime (Hours)"), csvCell("Repair Cost (PKR)"), csvCell("Status")].join(",")
    );
    breakdowns.forEach((b) =>
      rows.push(
        [
          csvCell(formatDate(b.Date)),
          csvCell(b.Problem),
          csvCell(b["Downtime (Hours)"]),
          csvCell(b["Repair Cost (PKR)"]),
          csvCell(b.Status),
        ].join(",")
      )
    );
    rows.push("");

    rows.push(csvCell("Upcoming Services"));
    rows.push([csvCell("Due Date"), csvCell("Due KM"), csvCell("Service Type"), csvCell("Priority")].join(","));
    upcomingServices.forEach((s) =>
      rows.push(
        [csvCell(formatDate(s["Due Date"])), csvCell(s["Due KM"]), csvCell(s["Service Type"]), csvCell(s.Priority)].join(",")
      )
    );

    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vehicle.Registration}_report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="reportpage-loading">Loading report data…</div>;
  }

  if (error) {
    return <div className="reportpage-error">{error}</div>;
  }

  return (
    <div className="reportpage">
      <Link to="/VehiclesPage" className="back-link">
        <ArrowLeft size={16} /> Back to Fleet
      </Link>

      <div className="reportpage-header">
        <div>
          <h1 className="reportpage-title">
            <FileText size={24} /> Vehicle Report
          </h1>
          <p className="reportpage-subtitle">Select a vehicle to generate and download its report</p>
        </div>

        <div className="reportpage-controls">
          <select
            className="reportpage-select"
            value={selectedReg}
            onChange={(e) => handleSelect(e.target.value)}
          >
            {allVehicles.map((v) => (
              <option key={v.Registration} value={v.Registration}>
                {v.Registration} — {v.Model}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="reportpage-btn reportpage-btn-primary"
            onClick={handleDownloadPDF}
            disabled={!vehicle}
          >
            <Printer size={16} /> Download PDF
          </button>
          <button
            type="button"
            className="reportpage-btn"
            onClick={handleDownloadCSV}
            disabled={!vehicle}
          >
            <Download size={16} /> Download CSV
          </button>
        </div>
      </div>

      {!vehicle ? (
        <div className="reportpage-empty">No vehicle selected.</div>
      ) : (
        <div className="report-print-wrapper" ref={printRef}>
          <div className="report-print-header">
            <div>
              <h1>{vehicle.Model}</h1>
              <p>
                {vehicle.Registration} · {vehicle.Department}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={statusBadgeClass[vehicle.Status]}>{vehicle.Status}</span>
              <p>Generated {new Date().toLocaleDateString("en-GB")}</p>
            </div>
          </div>

          <div className="report-print-section">
            <h3>Vehicle Information</h3>
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
                <span className="info-value">{Number(vehicle["Fuel Level (%)"] || 0)}%</span>
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

          <div className="summary-row">
            <div className="summary-box">
              <p>Maintenance Records</p>
              <h3>{maintenanceHistory.length}</h3>
              <p>{formatPKR(totalMaintenanceCost)} total spend</p>
            </div>
            <div className="summary-box">
              <p>Breakdown Records</p>
              <h3>{breakdowns.length}</h3>
              <p>{formatPKR(totalBreakdownCost)} repair cost</p>
            </div>
            <div className="summary-box">
              <p>Upcoming Services</p>
              <h3>{upcomingServices.length}</h3>
              <p>scheduled</p>
            </div>
          </div>

          <div className="report-print-section">
            <h3><Wrench size={16} /> Maintenance History</h3>
            {maintenanceHistory.length === 0 ? (
              <p className="empty-note">No maintenance records for this vehicle.</p>
            ) : (
              <table>
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

          <div className="report-print-section">
            <h3><AlertTriangle size={16} /> Breakdown History</h3>
            {breakdowns.length === 0 ? (
              <p className="empty-note">No breakdown records for this vehicle.</p>
            ) : (
              <table>
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
                      <td><span className="badge badge-active">{b.Status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-print-section">
            <h3><Clock size={16} /> Upcoming Services</h3>
            {upcomingServices.length === 0 ? (
              <p className="empty-note">No upcoming services scheduled for this vehicle.</p>
            ) : (
              <table>
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
      )}
    </div>
  );
}