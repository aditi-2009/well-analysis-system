import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, EyeOff, FileJson, Table2 } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AreaMap from "../../components/map/AreaMap";
import WellTable from "../../components/map/WellTable";
import ImagePanel from "../../components/detection/ImagePanel";
import { LocationPanel, PlaceSearch, VillagePicker } from "../../components/detection/AreaPickers";
import { Alert, Card, PageHeader, btn } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { useToast } from "../../context/ToastContext";
import { listKnownWells, listWells } from "../../services/wellService";
import { listImages, listJobs, startDetection, uploadImage, waitForJob } from "../../services/detectionService";
import { reverseGeocode } from "../../services/geocodeService";
import {
  areaSqMeters, bboxOfGeometry, bboxToLeaflet, circleToGeometry, filterWellsInBoundary, formatArea,
} from "../../utils/geo";
import { downloadWellsCsv, downloadWellsGeoJson } from "../../utils/exporters";
import { countByLevel } from "../../utils/confidence";
import { formatDuration } from "../../utils/format";

const TABS = [
  ["village", "Village list"],
  ["place", "Search place"],
  ["location", "My location"],
  ["draw", "Draw on map"],
];

export default function WellDetection() {
  useDocumentTitle("Well Detection");
  const { prefs, update, classify } = usePrefs();
  const toast = useToast();
  const stopped = useRef(false);
  const uploadAbort = useRef(null);

  // ---- Step 1: area -------------------------------------------------------
  const [tab, setTab] = useState("village");
  const [area, setArea] = useState({ geometry: null, label: "", ids: {}, source: null, approximate: false, note: "" });
  const [focus, setFocus] = useState(null);
  const [user, setUser] = useState(null);       // my GPS location
  const [radius, setRadius] = useState(500);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // ---- Step 2: imagery ----------------------------------------------------
  const [imgMode, setImgMode] = useState("existing");
  const [images, setImages] = useState([]);
  const [imageId, setImageId] = useState("");
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);
  const [footprint, setFootprint] = useState(null);
  const [params, setParams] = useState({ confidence: prefs.detectConfidence, tileSize: prefs.detectTileSize, normalize: null });

  // ---- Run + results ------------------------------------------------------
  const [phase, setPhase] = useState("idle"); // idle | uploading | starting | running | done | failed
  const [upload, setUpload] = useState({ loaded: 0, total: 0 });
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [jobWells, setJobWells] = useState([]);
  const [existing, setExisting] = useState([]);
  const [known, setKnown] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [clip, setClip] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const busy = ["uploading", "starting", "running"].includes(phase);
  const geometry = area.geometry;

  useEffect(() => {
    stopped.current = false;
    return () => { stopped.current = true; uploadAbort.current?.abort(); };
  }, []);

  const refreshImages = useCallback(async () => {
    try { setImages(await listImages()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refreshImages(); }, [refreshImages]);

  // ---- area helpers -------------------------------------------------------
  const applyArea = useCallback((next) => {
    setArea({ geometry: null, label: "", ids: {}, source: null, approximate: false, note: "", ...next });
    setSelectedId(null);
  }, []);

  const onBoundaryFromMap = useCallback((geom) => {
    if (!geom) { applyArea({ geometry: null, label: "", source: null }); return; }
    applyArea({ geometry: geom, label: "Drawn area", source: "drawn" });
    setTab("draw");
  }, [applyArea]);

  const pickVillage = (v) => applyArea({ geometry: v.geometry, label: v.label, ids: v.ids, source: "village", note: v.note });
  const pickPlace = (p) => {
    applyArea({ geometry: p.geometry, label: p.label, source: "place", approximate: p.approximate });
    if (!p.geometry) setFocus({ lat: p.center[0], lon: p.center[1], zoom: 15, token: Date.now() });
  };

  // ---- my location --------------------------------------------------------
  const makeCircle = useCallback((lat, lon, r, label) => {
    applyArea({ geometry: circleToGeometry(lat, lon, r), label: label || `Around ${lat.toFixed(5)}, ${lon.toFixed(5)} (${r} m)`, source: "location" });
  }, [applyArea]);

  const locate = () => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("This browser does not support location. Type coordinates instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUser(loc); setLocating(false); setTab("location");
        makeCircle(loc.lat, loc.lon, radius);
        reverseGeocode(loc.lat, loc.lon).then((label) => label && setUser((u) => (u ? { ...u, label } : u)));
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1 ? "Location permission was denied. Allow location for this site in the browser address bar, or type coordinates."
          : err.code === 2 ? "Your position could not be determined. Check GPS / network and try again."
          : "Getting your location timed out. Try again outdoors or type coordinates."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const goToCoords = (lat, lon) => {
    setUser({ lat, lon, accuracy: 0 });
    makeCircle(lat, lon, radius);
  };

  // Changing the radius redraws the circle around the same centre
  const changeRadius = (r) => {
    setRadius(r);
    if (area.source === "location" && user) makeCircle(user.lat, user.lon, r);
  };

  // ---- wells already stored for this area --------------------------------
  useEffect(() => {
    setExisting([]); setKnown([]);
    if (!geometry) return;
    const bbox = bboxOfGeometry(geometry);
    let alive = true;
    listWells({ bbox, limit: 20000 })
      .then((w) => alive && setExisting(filterWellsInBoundary(w, geometry)))
      .catch((e) => alive && toast.warning(`Could not load stored wells: ${e.message}`));
    return () => { alive = false; };
  }, [geometry]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showKnown || !geometry) { setKnown([]); return; }
    let alive = true;
    listKnownWells({ bbox: bboxOfGeometry(geometry), limit: 20000 })
      .then((w) => alive && setKnown(filterWellsInBoundary(w, geometry)))
      .catch((e) => alive && toast.warning(`Could not load verified wells: ${e.message}`));
    return () => { alive = false; };
  }, [showKnown, geometry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- detection run ------------------------------------------------------
  const finishJob = useCallback(async (result) => {
    if (stopped.current) return;
    setJob(result);
    if (result.status === "completed") {
      try {
        setJobWells(await listWells({ jobId: result.id, limit: 20000 }));
        setPhase("done");
      } catch (e) { setError(e.message); setPhase("failed"); }
    } else {
      setError(result.error_message || "The detection failed.");
      setPhase("failed");
    }
  }, []);

  const follow = useCallback(async (started) => {
    setJob(started); setPhase("running");
    const result = await waitForJob(started.id, setJob, () => stopped.current);
    await finishJob(result);
  }, [finishJob]);

  // Back on this page while a run is going: pick it up again
  useEffect(() => {
    let cancelled = false;
    listJobs(5).then((jobs) => {
      const active = jobs.find((j) => j.status === "pending" || j.status === "running");
      if (active && !cancelled) follow(active);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [follow]);

  const run = async () => {
    setError(""); setJobWells([]); setSelectedId(null); setJob(null);
    if (imgMode === "existing" && !imageId) { setError("Choose an image from the list, or switch to Upload."); return; }
    if (imgMode === "upload" && !file) { setError("Choose an image file to upload."); return; }
    if (!geometry) toast.warning("No boundary chosen: all wells found in the image will be shown.");

    try {
      let chosen = imageId;
      if (imgMode === "upload") {
        setPhase("uploading"); setUpload({ loaded: 0, total: file.size });
        uploadAbort.current = new AbortController();
        const up = await uploadImage(file, setUpload, uploadAbort.current.signal);
        chosen = up.fileId; setImageId(chosen); setUploaded(up); setFile(null); setImgMode("existing");
        // Show where the uploaded image lies (only when it is in lat/lon degrees)
        if (up.bounds && /4326/.test(up.crs || "")) setFootprint(bboxToLeaflet([up.bounds.minx, up.bounds.miny, up.bounds.maxx, up.bounds.maxy]));
        refreshImages();
        if (up.bounds && /4326/.test(up.crs || "")) setFocus({ bounds: bboxToLeaflet([up.bounds.minx, up.bounds.miny, up.bounds.maxx, up.bounds.maxy]), token: Date.now() });
      }
      setPhase("starting");
      const started = await startDetection({
        imageId: chosen,
        districtId: area.ids.districtId, talukaId: area.ids.talukaId, villageId: area.ids.villageId,
        confidence: params.confidence, tileSize: params.tileSize, normalize: params.normalize,
      });
      await follow(started);
    } catch (e) {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") { setPhase("idle"); toast.info("Upload cancelled."); return; }
      setError(e.message); setPhase("failed");
    }
  };

  // ---- what to display ----------------------------------------------------
  const shownJobWells = useMemo(() => (clip && geometry ? filterWellsInBoundary(jobWells, geometry) : jobWells), [jobWells, clip, geometry]);
  const hasRun = phase === "done";
  const displayWells = hasRun ? shownJobWells : existing;
  const counts = useMemo(() => countByLevel(displayWells, prefs.thresholds), [displayWells, prefs.thresholds]);
  const csvName = `wells_${(area.label || "area").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}`;

  const select = (id, zoom) => {
    setSelectedId(id);
    if (zoom) {
      const w = displayWells.find((x) => x.id === id);
      if (w) setFocus({ lat: w.latitude, lon: w.longitude, zoom: 19, token: Date.now() });
    }
  };

  const stats = job?.params?.stats;
  const took = job?.started_at && job?.completed_at ? formatDuration(new Date(job.completed_at) - new Date(job.started_at)) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Agricultural Well Detection" subtitle="Choose an area, mark its boundary on the map, then detect wells with their exact latitude, longitude and confidence.">
        <Link to="/app/results" className={btn.secondary}><Table2 className="h-4 w-4" /> All results</Link>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* LEFT: steps */}
        <div className="space-y-6">
          <Card title="1. Choose the area" subtitle="Pick one of four ways. The boundary appears on the map.">
            <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
              {TABS.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} disabled={busy}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab === k ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{l}</button>
              ))}
            </div>
            {tab === "village" && <VillagePicker value={area} onPick={pickVillage} disabled={busy} />}
            {tab === "place" && <PlaceSearch onPick={pickPlace} disabled={busy} />}
            {tab === "location" && (
              <LocationPanel location={user} locating={locating} onLocate={locate} onCoords={goToCoords} radius={radius} onRadius={changeRadius} geoError={geoError} />
            )}
            {tab === "draw" && (
              <p className="text-sm text-slate-600">Use the <b>Polygon</b>, <b>Rectangle</b> or <b>Circle</b> tools at the top-left of the map to outline your area. Zoom in first for a precise boundary.</p>
            )}

            {geometry && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Boundary set: {area.label}</p>
                <p className="mt-0.5">Area about {formatArea(areaSqMeters(geometry), prefs.areaUnit)}{area.approximate ? " (approximate outline)" : ""}. {existing.length} stored well{existing.length === 1 ? "" : "s"} inside.</p>
              </div>
            )}
          </Card>

          <Card title="2. Imagery & detection" subtitle="Upload an image for this area, or reuse one already on the server.">
            <ImagePanel
              mode={imgMode} onMode={setImgMode} images={images} imageId={imageId} onImageId={setImageId}
              file={file} onFile={setFile} busy={busy} phase={phase} upload={upload} job={job} uploaded={uploaded}
              params={params} onParams={(p) => setParams((s) => ({ ...s, ...p }))} onRun={run}
              onCancelUpload={() => uploadAbort.current?.abort()} hasBoundary={Boolean(geometry)}
            />
            {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          </Card>
        </div>

        {/* RIGHT: map + results */}
        <div className="min-w-0 space-y-6">
          <AreaMap
            className="h-[480px] lg:h-[620px]"
            boundary={geometry} wells={displayWells} knownWells={showKnown ? known : []}
            footprint={footprint} userLocation={user} focus={focus}
            selectedId={selectedId} onSelect={setSelectedId}
            onBoundaryChange={onBoundaryFromMap} onLocate={locate}
            layer={prefs.mapLayer} onLayerChange={(l) => update({ mapLayer: l })}
          />

          <Card
            title={hasRun ? `Detection result: ${displayWells.length} well${displayWells.length === 1 ? "" : "s"}${clip && geometry ? " inside your boundary" : ""}` : `Wells already stored in this area: ${displayWells.length}`}
            subtitle={hasRun ? "Exact coordinates (WGS 84) and the model's confidence for each well." : "Run a detection to find new wells. Earlier results for this area are shown until then."}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {geometry && (
                  <button className={btn.small} onClick={() => setShowKnown((s) => !s)} title="Officer-verified reference wells">
                    {showKnown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} Verified wells
                  </button>
                )}
                {hasRun && geometry && (
                  <button className={btn.small} onClick={() => setClip((c) => !c)}>{clip ? "Show whole image" : "Clip to boundary"}</button>
                )}
                <button className={btn.small} disabled={!displayWells.length} onClick={() => downloadWellsCsv(displayWells, prefs.thresholds, csvName)}><Download className="h-3.5 w-3.5" /> CSV</button>
                <button className={btn.small} disabled={!displayWells.length} onClick={() => downloadWellsGeoJson(displayWells, prefs.thresholds, geometry, csvName)}><FileJson className="h-3.5 w-3.5" /> GeoJSON</button>
              </div>
            }
          >
            {hasRun && (
              <div className="mb-4 grid gap-3 text-xs sm:grid-cols-4">
                {[
                  ["In boundary", shownJobWells.length],
                  ["Whole image", jobWells.length],
                  ["Tiles scanned", stats?.tiles ?? "-"],
                  ["Time taken", took || "-"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">{l}</p><p className="mt-0.5 text-lg font-bold text-slate-900">{v}</p></div>
                ))}
              </div>
            )}
            {hasRun && jobWells.length === 0 && (
              <Alert tone="warning" className="mb-4">
                No wells were found. {stats?.model_boxes === 0 ? "The model returned no marks for this image: it may hold no wells, or look different from the training images. " : ""}
                Try a lower minimum confidence under Advanced settings, or check that the image covers the area.
              </Alert>
            )}
            {hasRun && clip && geometry && jobWells.length > 0 && shownJobWells.length === 0 && (
              <Alert tone="warning" className="mb-4">Wells were found in the image, but none inside your boundary. Check that the image covers this area, or press “Show whole image”.</Alert>
            )}
            {displayWells.length > 0 && (
              <p className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span><b className="text-emerald-700">{counts.high}</b> high</span>
                <span><b className="text-amber-600">{counts.medium}</b> medium</span>
                <span><b className="text-red-600">{counts.low}</b> low confidence</span>
              </p>
            )}
            <WellTable wells={displayWells} selectedId={selectedId} onSelect={select}
              emptyText={geometry ? "No wells stored for this area yet. Choose imagery and press Detect wells." : "Choose an area to begin."} />
          </Card>
        </div>
      </div>
    </div>
  );
}
