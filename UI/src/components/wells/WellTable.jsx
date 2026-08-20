// src/components/wells/WellTable.jsx
import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";

function WellTable({ wells, onRowClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedWells = useMemo(() => {
    let result = wells.filter((well) => {
      const matchesSearch =
        well.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        well.village.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || well.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [wells, searchTerm, statusFilter, sortConfig]);

  const statusOptions = ["All", ...new Set(wells.map((w) => w.status))];

  return (
    <div className="well-table-wrapper">
      <div className="table-controls">
        <input
          type="text"
          className="table-search-input"
          placeholder="Search by Well ID or Village..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="table-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="table-scroll-container">
        <table className="wells-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("id")}>Well ID <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort("latitude")}>Latitude <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort("longitude")}>Longitude <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort("confidence")}>Confidence <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort("status")}>Status <ArrowUpDown size={12} /></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedWells.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty-row">No wells match your search/filter.</td>
              </tr>
            ) : (
              filteredAndSortedWells.map((well) => (
                <tr key={well.id} onClick={() => onRowClick(well)} className="table-row-clickable">
                  <td>{well.id}</td>
                  <td>{well.latitude}</td>
                  <td>{well.longitude}</td>
                  <td>{Math.round(well.confidence * 100)}%</td>
                  <td><span className="status-pill">{well.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WellTable;