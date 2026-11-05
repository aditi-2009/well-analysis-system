// Well detection. Search a village or a place (or draw an area), and the wells inside it are detected from the
// master image, with no upload. Or use an image already on the server, or upload one.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, EyeOff, FileJson, Globe, Table2, Trash2 } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AreaMap from "../../components/map/AreaMap";
import WellTable from "../../components/map/WellTable";
import MarkWellModal from "../../components/map/MarkWellModal";
import ImagePanel from "../../components/detection/ImagePanel";
import RunningNow from "../../components/detection/RunningNow";
import { LocationPanel, PlaceSearch, VillagePicker, VillageSearch } from "../../components/detection/AreaPickers";
import WellProfile from "../../components/wells/WellProfile";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import { Alert, Card, PageHeader, btn } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { useSystem } from "../../context/SystemContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { REQUIRED_BACKEND_VERSION } from "../../config/constants";
import { can, isAdmin } from "../../utils/permissions";
import { deleteKnownWell, deleteWell, exportWellsCsv, listKnownWells, listWells } from "../../services/wellService";
import { abortJob, deleteJob, getHealth, listImages, listJobs, startDetection, uploadImage, waitForJob } from "../../services/detectionService";
import { reverseGeocode } from "../../services/geocodeService";
import { areaSqMeters, bboxOfGeometry, bboxToLeaflet, circleToGeometry, filterWellsInBoundary, formatArea } from "../../utils/geo";
import { downloadBlob, downloadWellsCsv, downloadWellsGeoJson, downloadWellsKml } from "../../utils/exporters";
import { countByLevel } from "../../utils/confidence";
import { formatDuration } from "../../utils/format";

const TABS = [
  ["search", "Search village"],
  ["place", "Search place"],
  ["list", "Village list"],
  ["location", "My location"],
  ["draw", "Draw on map"],
];
const EMPTY_AREA = { ids: {}, label: "", geometry: null, source: null, approximate: false, note: "" };

export default function WellDetection() {
  useDocumentTitle("Well Detection");
  const { prefs, update } = usePrefs();
  const { thresholds } = useSystem();
  const { user } = useAuth();
  const toast = useToast();
  const admin = isAdmin(user);
  const stopped = useRef(false);
  const uploadAbort = useRef(null);
  const cancelledUpload = useRef(false);

  const [backend, setBackend] = useState("checking"); // checking | ok | old | offline
  const [tab, setTab] = useState("search");
  const [area, setArea] = useState(EMPTY_AREA);
  const [focus, setFocus] = useState(null);
  const [here, setHere] = useState(null);
  const [radius, setRadius] = useState(500);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [imgMode, setImgMode] = useState("existing"); // area | existing | upload
  const [images, setImages] = useState([]);
  const [imageId, setImageId] = useState("");
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);
  const [footprint, setFootprint] = useState(null);
  const [params, setParams] = useState({ confidence: null, tileSize: null, normalize: null });

  const [phase, setPhase] = useState("idle"); // idle | uploading | starting | running | stopping | done | cancelled | failed
  const [upload, setUpload] = useState({ loaded: 0, total: 0 });
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [runWells, setRunWells] = useState([]);
  const [stored, setStored] = useState([]);
  const [known, setKnown] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [knownTick, setKnownTick] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { type: "run" } | { type: "well", well } | { type: "known", known }
  const [deleting, setDeleting] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [markAt, setMarkAt] = useState(null);

  const geometry = area.geometry;
  const canArea = Boolean(geometry);
  const mode = imgMode === "area" && !canArea ? "existing" : imgMode;
  const busy = ["uploading", "starting", "running", "stopping"].includes(phase);
  const runView = phase === "done";

  const storedShown = useMemo(() => filterWellsInBoundary(stored, geometry), [stored, geometry]);
  const shownWells = runView ? runWells : storedShown;
  const shownKnown = useMemo(() => (showKnown ? filterWellsInBoundary(known, geometry) : []), [known, showKnown, geometry]);
  const counts = useMemo(() => countByLevel(shownWells, thresholds), [shownWells, thresholds]);
  const took = job?.started_at && job?.completed_at ? formatDuration(new Date(job.completed_at) - new Date(job.started_at)) : "-";
  const csvName = `wells_${(area.label || "area").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}`;

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
      uploadAbort.current?.abort();
    };
  }, []);

  // Is the backend running the version this page needs?
  useEffect(() => {
    let alive = true;
    getHealth()
      .then((h) => { if (alive) setBackend(String(h.version) === REQUIRED_BACKEND_VERSION ? "ok" : "old"); })
      .catch(() => { if (alive) setBackend("offline"); });
    return () => { alive = false; };
  }, []);

  const refreshImages = useCallback(async () => {
    try { setImages(await listImages()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refreshImages(); }, [refreshImages]);

  const refreshStored = useCallback(async () => {
    if (!geometry) { setStored([]); return; }
    try {
      setStored(await listWells({ bbox: bboxOfGeometry(geometry), limit: 20000 }));
    } catch (e) {
      toast.warning(`Could not load the wells already stored here: ${e.message}`);
    }
  }, [geometry, toast]);
  useEffect(() => { refreshStored(); }, [refreshStored]);

  const refreshKnown = useCallback(async () => {
    if (!showKnown || !geometry) { setKnown([]); return; }
    try {
      setKnown(await listKnownWells({ bbox: bboxOfGeometry(geometry), limit: 20000 }));
    } catch (e) {
      toast.warning(`Could not load verified wells: ${e.message}`);
    }
  }, [showKnown, geometry, toast]);
  useEffect(() => { refreshKnown(); }, [refreshKnown, knownTick]);

  // Watches one run until it ends, then loads its wells
  const follow = useCallback(async (started) => {
    setJob(started);
    setPhase("running");
    const result = await waitForJob(started.id, (j) => setJob(j), () => stopped.current);
    if (stopped.current) return;
    setJob(result);
    if (result.status === "completed") {
      try {
        setRunWells(await listWells({ jobId: result.id, limit: 20000 }));
        setPhase("done");
      } catch (e) {
        setError(e.message);
        setPhase("failed");
      }
    } else if (result.status === "cancelled") {
      setPhase("cancelled");
    } else {
      setError(result.error_message || "The detection failed.");
      setPhase("failed");
    }
  }, []);

  // Back on this page while one of my runs is still going: pick it up again
  useEffect(() => {
    let cancelled = false;
    listJobs({ limit: 5, scope: "mine" })
      .then((jobs) => {
        const active = jobs.find((j) => j.status === "pending" || j.status === "running");
        if (active && !cancelled) follow(active);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [follow]);

  // ---- area: every way of choosing one ends here. A chosen area goes straight to "Detect inside this area" ----
  const pickArea = (next) => {
    setArea({ ...EMPTY_AREA, ...next });
    setSelectedId(null);
    setImgMode(next.geometry ? "area" : "existing");
  };

  const onBoundaryFromMap = (geom) => (geom ? pickArea({ geometry: geom, label: "Drawn area", source: "drawn" }) : pickArea({}));

  const pickPlace = (p) => {
    pickArea({
      geometry: p.geometry,
      label: p.label,
      source: "place",
      approximate: Boolean(p.approximate),
      note: p.geometry ? "" : "No outline was found for this place. Draw the area on the map.",
    });
    if (!p.geometry) setFocus({ lat: p.center[0], lon: p.center[1], zoom: 15, token: Date.now() });
  };

  const makeCircle = (lat, lon, r, label) => {
    pickArea({
      geometry: circleToGeometry(lat, lon, r),
      label: label || `Around ${lat.toFixed(5)}, ${lon.toFixed(5)} (${r} m)`,
      source: "location",
    });
  };

  const locate = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("This browser does not support location. Type the coordinates instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setHere(loc);
        setLocating(false);
        setTab("location");
        makeCircle(loc.lat, loc.lon, radius);
        reverseGeocode(loc.lat, loc.lon).then((label) => label && setHere((h) => (h ? { ...h, label } : h)));
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1 ? "Location permission was denied. Allow location for this site in the browser address bar, or type the coordinates."
            : err.code === 2 ? "Your position could not be determined. Check GPS or network and try again."
              : "Getting your location timed out. Try again outdoors, or type the coordinates."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const goToCoords = (lat, lon) => {
    setHere({ lat, lon, accuracy: 0 });
    makeCircle(lat, lon, radius);
  };

  const changeRadius = (r) => {
    setRadius(r);
    if (area.source === "location" && here) makeCircle(here.lat, here.lon, r);
  };

  // ---- run ----------------------------------------------------------------------------
  const run = async () => {
    setError("");
    setRunWells([]);
    setSelectedId(null);
    setJob(null);
    cancelledUpload.current = false;
    if (mode === "area" && !canArea) { setError("Search a village or a place, or draw an area, first."); return; }
    if (mode === "existing" && !imageId) { setError("Choose an image from the list, or switch to Upload."); return; }
    if (mode === "upload" && !file) { setError("Choose an image file to upload."); return; }

    const common = {
      boundary: geometry || undefined,
      areaLabel: area.label || undefined,
      districtId: area.ids.districtId,
      talukaId: area.ids.talukaId,
      villageId: area.ids.villageId,
      confidence: admin ? params.confidence : null,
      tileSize: admin ? params.tileSize : null,
      normalize: admin ? params.normalize : null,
    };

    try {
      let started;
      if (mode === "area") {
        setPhase("starting");
        started = await startDetection({ useMaster: true, ...common });
      } else {
        let chosen = imageId;
        if (mode === "upload") {
          setPhase("uploading");
          setUpload({ loaded: 0, total: file.size });
          uploadAbort.current = new AbortController();
          const up = await uploadImage(file, setUpload, uploadAbort.current.signal);
          chosen = up.fileId;
          setImageId(chosen);
          setUploaded(up);
          setFile(null);
          setImgMode("existing");
          refreshImages();
          if (up.bounds && /4326/.test(up.crs || "")) {
            const b = [up.bounds.minx, up.bounds.miny, up.bounds.maxx, up.bounds.maxy];
            setFootprint(bboxToLeaflet(b));
          }
        }
        setPhase("starting");
        started = await startDetection({ imageId: chosen, ...common });
      }
      await follow(started);
    } catch (e) {
      if (cancelledUpload.current) {
        setPhase("idle");
        toast.info("Upload cancelled.");
        return;
      }
      setError(e.message);
      setPhase("failed");
    }
  };

  const cancelUpload = () => {
    cancelledUpload.current = true;
    uploadAbort.current?.abort();
  };

  const stopRun = async () => {
    if (!job) return;
    setPhase("stopping");
    try {
      const res = await abortJob(job.id);
      setJob(res);
      toast.info("Stopping. Nothing will be saved for this run.");
    } catch (e) {
      toast.warning(e.message);
    }
  };

  // ---- results: open, delete, export --------------------------------------------------
  const openProfile = (id) => {
    setSelectedId(id);
    const det = shownWells.find((w) => w.id === id);
    if (det) { setProfile({ well: det, kind: "detected" }); return; }
    const k = shownKnown.find((x) => x.id === id);
    if (k) setProfile({ well: k, kind: "verified" });
  };

  const showOnMap = (w) => {
    setSelectedId(w.id);
    setFocus({ lat: w.latitude, lon: w.longitude, zoom: 19, token: Date.now() });
  };

  const canDeleteWell = (w) => can(user, "results.delete.any") || w.userId === user?.id;
  const canDeleteKnown = (k) => admin && k.source === "admin-manual";

  const confirmDeleteAction = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === "run") {
        const res = await deleteJob(job.id);
        toast.success(`Results deleted (${res.wells_removed} wells).`);
        setJob(null);
        setRunWells([]);
        setPhase("idle");
        refreshStored();
      } else if (pendingDelete.type === "well") {
        const w = pendingDelete.well;
        await deleteWell(w.numericId);
        setRunWells((list) => list.filter((x) => x.id !== w.id));
        setStored((list) => list.filter((x) => x.id !== w.id));
        toast.success(`Well #${w.id} deleted.`);
      } else if (pendingDelete.type === "known") {
        await deleteKnownWell(pendingDelete.known.knownId);
        setKnown((list) => list.filter((x) => x.id !== pendingDelete.known.id));
        toast.success("Verified well removed.");
      }
      setProfile(null);
      setPendingDelete(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const deleteText = pendingDelete?.type === "run"
    ? "The wells of this detection run are removed from the database. This cannot be undone."
    : pendingDelete?.type === "known"
      ? "This verified well is removed from the map for everyone. This cannot be undone."
      : "This well is removed from the database. This cannot be undone.";

  const serverCsv = async () => {
    try {
      downloadBlob(`wells_run_${job.id.slice(0, 8)}.csv`, await exportWellsCsv({ jobId: job.id }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onMarked = () => {
    setShowKnown(true);
    setKnownTick((t) => t + 1);
    toast.success("Well saved as verified.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agricultural Well Detection"
        subtitle="Search a village or a place to detect the wells inside it, with no upload. Or choose an image. Your runs and wells are shown here."
      >
        <Link to="/app/results" className={btn.secondary}><Table2 className="h-4 w-4" /> My results</Link>
      </PageHeader>

      {backend === "old" && (
        <Alert tone="error">
          The backend running on this computer is out of date, so village and place search will fail. Copy the latest
          Backend files into your project, then restart uvicorn from the Backend folder.
        </Alert>
      )}
      {backend === "offline" && <Alert tone="error">The backend cannot be reached. Start uvicorn, then reload this page.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        {/* LEFT: steps */}
        <div className="space-y-6">
          <Card title="1. Choose the area" subtitle="Search a village or a place. Its outline appears on the map.">
            <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
              {TABS.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} disabled={busy}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab === k ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "search" && <VillageSearch onPick={pickArea} disabled={busy} />}
            {tab === "place" && <PlaceSearch onPick={pickPlace} disabled={busy} />}
            {tab === "list" && <VillagePicker value={area} onPick={pickArea} disabled={busy} />}
            {tab === "location" && (
              <LocationPanel location={here} locating={locating} onLocate={locate} onCoords={goToCoords}
                radius={radius} onRadius={changeRadius} geoError={geoError} />
            )}
            {tab === "draw" && (
              <p className="text-sm text-slate-600">
                Use the <b>Polygon</b>, <b>Rectangle</b> or <b>Circle</b> buttons at the top left of the map to outline the area.
                Zoom in first for a precise boundary.
              </p>
            )}

            {geometry && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Area: {area.label}</p>
                <p className="mt-0.5">
                  About {formatArea(areaSqMeters(geometry), prefs.areaUnit)}
                  {area.approximate ? ", outline from the map (approximate)" : ""}. Detection runs inside it.
                </p>
              </div>
            )}
            {area.note && <Alert tone="warning" className="mt-4">{area.note}</Alert>}
          </Card>

          <Card title="2. Imagery and detection" subtitle="Detect inside the area with no upload, or use or upload an image.">
            <ImagePanel
              mode={mode} onMode={setImgMode} canArea={canArea} areaName={area.label} approximate={area.approximate}
              images={images} imageId={imageId} onImageId={setImageId} file={file} onFile={setFile}
              busy={busy} phase={phase} upload={upload} job={job} uploaded={uploaded}
              isAdmin={admin} params={params} onParams={(p) => setParams((s) => ({ ...s, ...p }))}
              onRun={run} onAbort={stopRun} onCancelUpload={cancelUpload}
            />
            {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          </Card>

          {admin && <RunningNow refreshKey={phase} />}
        </div>

        {/* RIGHT: map and results */}
        <div className="min-w-0 space-y-6">
          <AreaMap
            className="h-[480px] lg:h-[600px]"
            boundary={geometry}
            wells={shownWells}
            knownWells={shownKnown}
            footprint={footprint}
            userLocation={here}
            focus={focus}
            selectedId={selectedId}
            onSelect={openProfile}
            onBoundaryChange={onBoundaryFromMap}
            onLocate={locate}
            layer={prefs.mapLayer}
            onLayerChange={(l) => update({ mapLayer: l })}
            markMode={markMode}
            onToggleMark={admin ? () => setMarkMode((m) => !m) : undefined}
            onMarkPoint={(lat, lon) => setMarkAt({ lat, lon })}
          />

          <Card
            title={runView
              ? `${runWells.length} well${runWells.length === 1 ? "" : "s"} found${geometry ? " in the area" : ""}`
              : `${storedShown.length} well${storedShown.length === 1 ? "" : "s"} already stored here`}
            subtitle={runView
              ? "Exact coordinates (WGS 84), the village and district each well lies in, and its confidence."
              : "Run a detection to find new wells. Your earlier wells for this area are shown until then."}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {geometry && (
                  <button type="button" className={btn.small} onClick={() => setShowKnown((s) => !s)} title="Verified wells">
                    {showKnown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} Verified wells
                  </button>
                )}
                <button type="button" className={btn.small} disabled={!shownWells.length} onClick={() => downloadWellsCsv(shownWells, thresholds, csvName)}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button type="button" className={btn.small} disabled={!shownWells.length} onClick={() => downloadWellsGeoJson(shownWells, thresholds, geometry, csvName)}>
                  <FileJson className="h-3.5 w-3.5" /> GeoJSON
                </button>
                <button type="button" className={btn.small} disabled={!shownWells.length} onClick={() => downloadWellsKml(shownWells, thresholds, geometry, csvName)}>
                  <Globe className="h-3.5 w-3.5" /> KML
                </button>
              </div>
            }
          >
            {phase === "cancelled" && <Alert tone="warning" className="mb-4">Detection stopped. Nothing was saved for this run.</Alert>}

            {runView && (
              <div className="mb-4 space-y-3">
                <div className="grid gap-3 text-xs sm:grid-cols-3">
                  {[
                    ["Wells found", runWells.length],
                    ["Tiles scanned", job?.params?.stats?.tiles ?? "-"],
                    ["Time taken", took],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">{label}</p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                {runWells.length === 0 && (
                  <Alert tone="warning">
                    No wells were found in this area. Check that the imagery covers it{admin ? ", or try a lower minimum confidence under Advanced settings" : ""}.
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn.dangerSmall} onClick={() => setPendingDelete({ type: "run" })}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete these results
                  </button>
                  <button type="button" className={btn.small} onClick={serverCsv}>
                    <Download className="h-3.5 w-3.5" /> Full CSV from server
                  </button>
                  <button type="button" className={btn.secondary} onClick={() => { setJob(null); setRunWells([]); setPhase("idle"); }}>
                    Run another detection
                  </button>
                </div>
              </div>
            )}

            {shownWells.length > 0 && (
              <p className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span><b className="text-emerald-700">{counts.high}</b> high</span>
                <span><b className="text-amber-600">{counts.medium}</b> medium</span>
                <span><b className="text-red-600">{counts.low}</b> low confidence</span>
              </p>
            )}

            <WellTable
              wells={shownWells}
              selectedId={selectedId}
              onView={(w) => openProfile(w.id)}
              onLocate={showOnMap}
              canDelete={canDeleteWell}
              onDelete={(w) => setPendingDelete({ type: "well", well: w })}
              emptyText={geometry ? "No wells stored here yet. Choose imagery and press Detect." : "Search a village or a place to begin."}
            />
          </Card>
        </div>
      </div>

      {profile && (
        <WellProfile
          well={profile.well}
          kind={profile.kind}
          canDelete={profile.kind === "verified" ? canDeleteKnown(profile.well) : canDeleteWell(profile.well)}
          onDelete={() => setPendingDelete(profile.kind === "verified"
            ? { type: "known", known: profile.well }
            : { type: "well", well: profile.well })}
          onClose={() => setProfile(null)}
        />
      )}

      <MarkWellModal at={markAt} onClose={() => setMarkAt(null)} onSaved={onMarked} />

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === "run" ? "Delete these results?" : "Delete this well?"}
        text={deleteText}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
