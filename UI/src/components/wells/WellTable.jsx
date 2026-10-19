// src/components/wells/WellTable.jsx
// Search, status filter, sortable columns and pages. Rows per page come from Settings.
import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { wellLevel } from "../../utils/confidence";
import { loadSettings } from "../../utils/settingsStore";
import Button from "../common/Button";

const COLUMNS = [
  { key: "id", label: "Well ID" },
  { key: "village", label: "Village" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "confidence", label: "Confidence" },
  { key: "status", label: "Status" },
];

// Numbers compare as numbers. Text compares as text, with "9" before "10".
function compare(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true });
}

function coordinate(value) {
  return value == null ? "-" : Number(value).toFixed(5);
}

function WellTable({ wells, onRowClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState({ key: "id", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(() => Number(loadSettings().resultsPerPage) || 10);

  const toggleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const statusOptions = useMemo(() => ["All", ...new Set(wells.map((w) => w.status))], [wells]);

  const rows = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    const filtered = wells.filter((well) => {
      const matchesText =
        !text ||
        [well.id, well.village, well.taluka, well.district].some((value) =>
          String(value ?? "").toLowerCase().includes(text)
        );
      const matchesStatus = statusFilter === "All" || well.status === statusFilter;
      return matchesText && matchesStatus;
    });
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => factor * compare(a[sort.key], b[sort.key]));
  }, [wells, searchTerm, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  return (
    <div>
      <div className="ds-table-tools">
        <div className="ds-search" style={{ flex: "1 1 260px" }}>
          <Search size={16} aria-hidden="true" />
          <input
            className="ds-input"
            type="search"
            placeholder="Search by well ID, village, taluka or district"
            aria-label="Search wells"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="ds-select"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All statuses" : status}
            </option>
          ))}
        </select>
      </div>

      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button type="button" className="ds-th-btn" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </button>
                </th>
              ))}
              <th scope="col">
                <span className="ds-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="ds-table-empty">
                  No wells match your search or filter.
                </td>
              </tr>
            ) : (
              visible.map((well) => {
                const level = wellLevel(well);
                return (
                  <tr key={well.id} onClick={() => onRowClick?.(well)}>
                    <td>{well.id}</td>
                    <td>{well.village && well.village !== "Unknown" ? well.village : "-"}</td>
                    <td>{coordinate(well.latitude)}</td>
                    <td>{coordinate(well.longitude)}</td>
                    <td>
                      <span className={`ds-pill ds-pill-${level.key}`}>
                        {level.key === "verified"
                          ? "Verified"
                          : `${Math.round(well.confidence * 100)}% ${level.label}`}
                      </span>
                    </td>
                    <td>{well.status}</td>
                    <td className="ds-td-action">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRowClick?.(well);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="ds-table-foot">
        <span>
          {rows.length === 0
            ? "No wells"
            : `Showing ${start + 1}-${start + visible.length} of ${rows.length} wells`}
        </span>
        <div className="ds-pager">
          <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <span>
            Page {current} of {pageCount}
          </span>
          <Button variant="secondary" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WellTable;
