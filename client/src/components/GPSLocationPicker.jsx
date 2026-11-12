import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Clean custom SVG & CSS-based markers that work reliably across all browsers and devices
const createGpsDotIcon = () =>
  L.divIcon({
    className: "sv-gps-dot-icon",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #2563eb;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4), 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const createComplaintPinIcon = (isManual = false) =>
  L.divIcon({
    className: "sv-complaint-pin-icon",
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background: ${isManual ? "#ea580c" : "#dc2626"};
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          white-space: nowrap;
          border: 2px solid #ffffff;
          margin-bottom: 2px;
        ">
          ${isManual ? "📍 Complaint Spot (Manual)" : "📍 Complaint Spot (GPS)"}
        </div>
        <div style="
          width: 24px;
          height: 24px;
          background: ${isManual ? "#ea580c" : "#dc2626"};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });

// Component to smoothly fly/pan the map to newly detected or clicked coordinates
function MapCenterController({ center, zoom = 17 }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [center, zoom, map]);
  return null;
}

// Allows the user to click anywhere on the map to set or fine-tune complaint location
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (e && e.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function GPSLocationPicker({ onLocationChange }) {
  // State: "idle" | "detecting" | "success" | "error"
  const [status, setStatus] = useState("idle");
  // The actual live GPS coordinates returned by device: [lat, lng] or null
  const [deviceGpsCoords, setDeviceGpsCoords] = useState(null);
  // The final selected complaint coordinates (either GPS or manually adjusted): [lat, lng]
  const [selectedCoords, setSelectedCoords] = useState(null);
  // Actual accuracy in meters returned by device (never hardcoded)
  const [accuracy, setAccuracy] = useState(null);
  // Whether the location was GPS-detected or manually adjusted
  const [locationSource, setLocationSource] = useState("none"); // "none" | "gps" | "manual"
  // Friendly street/village/mandal address from reverse geocoding
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  // Detailed error message (bilingual)
  const [errorMessage, setErrorMessage] = useState(null);
  // Map tile style: "streets" (Google Maps-like clean road map with all labels) | "hybrid" (satellite + roads)
  const [mapStyle, setMapStyle] = useState("streets");

  // Keep a reference to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Notify parent component of valid coordinates
  const notifyParent = useCallback(
    (lat, lng, acc, captured, source) => {
      if (onLocationChange) {
        onLocationChange({
          latitude: lat,
          longitude: lng,
          location_accuracy: acc,
          location_captured: captured,
          location_source: source,
        });
      }
    },
    [onLocationChange]
  );

  // Reverse geocode via OpenStreetMap Nominatim for ANY real location
  const lookupAddress = async (lat, lng) => {
    if (isNaN(lat) || isNaN(lng)) return;
    setIsResolvingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        if (data && data.display_name) {
          // Format readable address: Road / Landmark, Village / Suburb, Mandal / Town, District
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.suburb || "";
          const village = addr.village || addr.town || addr.hamlet || addr.neighbourhood || addr.city || "";
          const county = addr.county || addr.state_district || "";
          const state = addr.state || "";

          const parts = [road, village, county, state].filter(Boolean);
          const formatted = parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 3).join(", ");
          setResolvedAddress(formatted);
        }
      }
    } catch {
      // Ignore network errors gracefully
    } finally {
      if (isMountedRef.current) {
        setIsResolvingAddress(false);
      }
    }
  };

  // =========================================================================
  // REAL-TIME CURRENT GPS DETECTION (Browser Geolocation API)
  // =========================================================================
  const detectLiveLocation = () => {
    setErrorMessage(null);

    // 1. Check if browser supports Geolocation
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage({
        en: "Geolocation is not supported by your browser. Please select your location manually on the map.",
        te: "మీ బ్రౌజర్ స్థాన గుర్తింపుకు మద్దతు ఇవ్వదు. దయచేసి మ్యాప్‌లో మీ స్థానాన్ని మాన్యువల్‌గా ఎంచుకోండి.",
      });
      return;
    }

    // 2. Check for Secure Context (HTTPS or localhost)
    if (typeof window !== "undefined" && window.isSecureContext === false && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setStatus("error");
      setErrorMessage({
        en: "Location access requires a secure connection (HTTPS). Please open this website using HTTPS or click on the map to set your location.",
        te: "స్థాన ప్రాప్యతకు సురక్షిత కనెక్షన్ (HTTPS) అవసరం. దయచేసి HTTPS ఉపయోగించండి లేదా మ్యాప్‌పై క్లిక్ చేసి స్థానాన్ని ఎంచుకోండి.",
      });
      return;
    }

    setStatus("detecting");

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds as specified
      maximumAge: 0,  // Force fresh reading from device GPS hardware
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;

        const rawLat = position.coords.latitude;
        const rawLng = position.coords.longitude;
        const rawAcc = position.coords.accuracy;

        // Strict validation: coordinates must be real valid numbers
        if (typeof rawLat !== "number" || typeof rawLng !== "number" || isNaN(rawLat) || isNaN(rawLng)) {
          setStatus("error");
          setErrorMessage({
            en: "Invalid coordinates received from device. Please retry or click on the map.",
            te: "పరికరం నుండి అమాన్య సమన్వయాలు వచ్చాయి. దయచేసి మళ్లీ ప్రయత్నించండి లేదా మ్యాప్‌పై తాకండి.",
          });
          return;
        }

        // Validate latitude between -90 and 90, longitude between -180 and 180
        if (rawLat < -90 || rawLat > 90 || rawLng < -180 || rawLng > 180) {
          setStatus("error");
          setErrorMessage({
            en: "Coordinates out of bounds. Please click on the map.",
            te: "సమన్వయాలు పరిధి వెలుపల ఉన్నాయి. దయచేసి మ్యాప్‌పై తాకండి.",
          });
          return;
        }

        const lat = parseFloat(rawLat.toFixed(6));
        const lng = parseFloat(rawLng.toFixed(6));
        const acc = rawAcc ? Math.round(rawAcc) : null;

        setDeviceGpsCoords([lat, lng]);
        setSelectedCoords([lat, lng]);
        setAccuracy(acc);
        setLocationSource("gps");
        setStatus("success");
        setErrorMessage(null);

        // Notify parent with real device values
        notifyParent(lat, lng, acc, true, "gps");

        // Reverse geocode real location
        lookupAddress(lat, lng);
      },
      (error) => {
        if (!isMountedRef.current) return;

        setStatus("error");

        let errEn = "";
        let errTe = "";

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errEn = "Location permission denied. Please allow location access in your browser settings or select the location manually on the map.";
            errTe = "స్థాన అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్స్‌లో అనుమతించండి లేదా మ్యాప్‌లో మీ స్థానాన్ని ఎంచుకోండి.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errEn = "Your current location could not be detected. Please check your GPS and try again.";
            errTe = "మీ ప్రస్తుత స్థానాన్ని గుర్తించలేకపోయాము. దయచేసి GPS ఆన్ చేసి మళ్లీ ప్రయత్నించండి.";
            break;
          case 3: // TIMEOUT
            errEn = "Location detection is taking too long. Please move to an open area and try again.";
            errTe = "స్థాన గుర్తింపు ఎక్కువ సమయం తీసుకుంటోంది. దయచేసి బహిరంగ ప్రదేశంలోకి వెళ్లి మళ్లీ ప్రయత్నించండి.";
            break;
          default:
            errEn = error.message || "An unexpected error occurred while detecting location.";
            errTe = "స్థానాన్ని గుర్తించడంలో లోపం సంభవించింది. దయచేసి మ్యాప్‌పై తాకండి.";
            break;
        }

        setErrorMessage({ en: errEn, te: errTe });
      },
      geoOptions
    );
  };

  // =========================================================================
  // MANUAL LOCATION ADJUSTMENT (Click on Map or Drag Marker)
  // =========================================================================
  const handleManualLocationChange = (rawLat, rawLng) => {
    if (isNaN(rawLat) || isNaN(rawLng)) return;
    const lat = parseFloat(rawLat.toFixed(6));
    const lng = parseFloat(rawLng.toFixed(6));

    setSelectedCoords([lat, lng]);
    setLocationSource("manual");
    setStatus("success");
    setErrorMessage(null);

    // When manually adjusted, save the new coordinates with source "manual"
    notifyParent(lat, lng, accuracy, true, "manual");

    // Lookup address for the newly chosen spot
    lookupAddress(lat, lng);
  };

  // Clear / Reset location
  const handleClearLocation = () => {
    setDeviceGpsCoords(null);
    setSelectedCoords(null);
    setAccuracy(null);
    setLocationSource("none");
    setStatus("idle");
    setResolvedAddress("");
    setErrorMessage(null);
    notifyParent(null, null, null, false, "none");
  };

  // Initial default map center if no coordinates detected yet:
  // General Andhra Pradesh / India regional view at zoom 7 until user detects or clicks
  const initialMapCenter = [16.5, 80.5];
  const activeMapCenter = selectedCoords || deviceGpsCoords || initialMapCenter;
  const activeMapZoom = selectedCoords ? 17 : 7;

  return (
    <div
      style={{
        margin: "1rem 0",
        padding: "1.25rem",
        background: "#ffffff",
        borderRadius: "16px",
        border: selectedCoords ? "2px solid #10b981" : "2px solid #0284c7",
        boxShadow: "0 4px 20px rgba(10, 37, 64, 0.08)",
      }}
    >
      {/* Header with Title & Instructions */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
          <span style={{ fontSize: "1.5rem" }}>📍</span>
          <div>
            <strong style={{ fontSize: "1.08rem", color: "#0a2540", display: "block" }}>
              సమస్య ఉన్న స్థలాన్ని గుర్తించండి (Identify Problem Location)
            </strong>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              మీ నిజమైన ప్రస్తుత స్థానాన్ని గుర్తించడానికి క్రింది బటన్ నొక్కండి లేదా మ్యాప్‌పై తాకి ఎంచుకోండి
            </span>
          </div>
        </div>
      </div>

      {/* PRIMARY GPS DETECTION BUTTON */}
      <div style={{ marginBottom: "0.85rem" }}>
        <button
          type="button"
          onClick={detectLiveLocation}
          disabled={status === "detecting"}
          style={{
            width: "100%",
            padding: "0.95rem 1.4rem",
            background: status === "detecting" ? "#94a3b8" : "linear-gradient(135deg, #0a2540 0%, #0284c7 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1.02rem",
            fontWeight: "700",
            cursor: status === "detecting" ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.3)",
            transition: "all 0.25s ease",
          }}
        >
          {status === "detecting" ? (
            <>
              <span style={{ fontSize: "1.3rem", display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span>
              <span>Detecting your current location... (మీ ప్రస్తుత స్థానాన్ని గుర్తిస్తున్నాము...)</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "1.3rem" }}>📍</span>
              <span>
                {selectedCoords
                  ? "మళ్ళీ నా ప్రస్తుత స్థానాన్ని గుర్తించండి (Re-detect Current GPS)"
                  : "నా ప్రస్తుత స్థానాన్ని గుర్తించండి (Get My Current Location)"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* ERROR NOTICE (Permission Denied, Timeout, Unavailable) */}
      {status === "error" && errorMessage && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #f87171",
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1rem",
            color: "#991b1b",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.3rem" }}>⚠️</span>
            <div>
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "0.25rem" }}>
                స్థాన గుర్తింపు లోపం (Location Notice)
              </strong>
              <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.88rem", lineHeight: 1.45 }}>
                {errorMessage.te}
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#b91c1c" }}>
                {errorMessage.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CARD: Display real coordinates, accuracy, and source */}
      {status === "success" && selectedCoords && (
        <div
          style={{
            background: locationSource === "manual" ? "#fffbeb" : "#f0fdf4",
            border: locationSource === "manual" ? "1.5px solid #fde68a" : "1.5px solid #a7f3d0",
            borderRadius: "12px",
            padding: "1rem 1.15rem",
            marginBottom: "1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.6rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "1.1rem" }}>{locationSource === "manual" ? "📍" : "✅"}</span>
                <strong style={{ fontSize: "0.98rem", color: locationSource === "manual" ? "#92400e" : "#065f46" }}>
                  {locationSource === "manual"
                    ? "మ్యాప్‌లో సర్దుబాటు చేసిన ఫిర్యాదు స్థానం (Manually Adjusted Location)"
                    : "ప్రస్తుత స్థానం విజయవంతంగా గుర్తించబడింది! (Live GPS Location Detected)"}
                </strong>
              </div>

              {/* Resolved Address / Village Name */}
              {isResolvingAddress ? (
                <div style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0" }}>
                  🔍 చిరునామాను గుర్తిస్తున్నాము (Looking up village / street name...)...
                </div>
              ) : resolvedAddress ? (
                <div style={{ fontSize: "0.92rem", color: "#0f172a", fontWeight: "600", margin: "0.25rem 0" }}>
                  🏡 {resolvedAddress}
                </div>
              ) : null}

              {/* Exact Coordinates & Device Accuracy */}
              <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "0.35rem", display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
                <span>
                  <strong>అక్షాంశం (Lat):</strong> {selectedCoords[0].toFixed(6)}
                </span>
                <span>
                  <strong>రేఖాంశం (Lng):</strong> {selectedCoords[1].toFixed(6)}
                </span>
                {accuracy && locationSource === "gps" && (
                  <span style={{ color: accuracy > 100 ? "#b45309" : "#047857", fontWeight: "600" }}>
                    • GPS ఖచ్చితత్వం: ±{accuracy} మీటర్లు (metres)
                  </span>
                )}
              </div>

              {/* High Accuracy Warning Notice */}
              {accuracy && accuracy > 100 && locationSource === "gps" && (
                <div style={{ fontSize: "0.8rem", color: "#b45309", marginTop: "0.4rem", background: "#fef3c7", padding: "4px 8px", borderRadius: "6px" }}>
                  ⚠️ GPS ఖచ్చితత్వం ±{accuracy}m గా ఉంది. మీరు సమస్య ఉన్న ఖచ్చితమైన స్థలం కోసం మ్యాప్‌పై తాకి పిన్‌ను జరపవచ్చు.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearLocation}
              style={{
                padding: "0.45rem 0.85rem",
                background: "#fee2e2",
                color: "#991b1b",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
              }}
              title="స్థానాన్ని తొలగించండి"
            >
              ✕ తొలగించు (Clear)
            </button>
          </div>
        </div>
      )}

      {/* MAP CONTROLS & INSTRUCTIONS BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "0.82rem", color: "#334155", fontWeight: "600" }}>
          🗺️ మ్యాప్‌పై తాకి పిన్‌ను ఎక్కడైనా ఉంచవచ్చు (Tap map or drag pin to adjust)
        </span>

        {/* Map Layer Switcher: Street (Google Maps-like) vs Satellite Hybrid */}
        <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "8px", padding: "2px", border: "1px solid #cbd5e1" }}>
          <button
            type="button"
            onClick={() => setMapStyle("streets")}
            style={{
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: "700",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: mapStyle === "streets" ? "#0284c7" : "transparent",
              color: mapStyle === "streets" ? "#ffffff" : "#475569",
              transition: "all 0.2s",
            }}
          >
            🗺️ Street Map
          </button>
          <button
            type="button"
            onClick={() => setMapStyle("hybrid")}
            style={{
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: "700",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: mapStyle === "hybrid" ? "#0284c7" : "transparent",
              color: mapStyle === "hybrid" ? "#ffffff" : "#475569",
              transition: "all 0.2s",
            }}
          >
            🛰️ Satellite + Roads
          </button>
        </div>
      </div>

      {/* LEAFLET MAP CONTAINER (Google Maps-like Street and Place Labels) */}
      <div
        style={{
          height: "360px",
          width: "100%",
          borderRadius: "14px",
          overflow: "hidden",
          border: "2px solid #cbd5e1",
          position: "relative",
          zIndex: 1,
        }}
      >
        <MapContainer
          center={activeMapCenter}
          zoom={activeMapZoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          {/* TILE LAYER 1: Clean, Highly Detailed Street Map with Villages, Streets, Temples, Schools (Google Maps style) */}
          {mapStyle === "streets" ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          ) : (
            <>
              {/* TILE LAYER 2: Satellite Imagery */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                maxZoom={19}
              />
              {/* Overlay with Road Names, Village Names, Landmarks, and Boundaries */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri Labels</a>'
                maxZoom={19}
              />
            </>
          )}

          {/* Smooth Fly-To / Auto-Zoom Controller */}
          {selectedCoords && <MapCenterController center={selectedCoords} zoom={17} />}

          {/* Real Device GPS Dot & Actual Accuracy Circle */}
          {deviceGpsCoords && (
            <>
              <Marker position={deviceGpsCoords} icon={createGpsDotIcon()}>
                <Popup>
                  <div style={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                    <strong>🔵 Your Device GPS Position</strong>
                    <br />
                    Lat: {deviceGpsCoords[0].toFixed(6)}
                    <br />
                    Lng: {deviceGpsCoords[1].toFixed(6)}
                    {accuracy && (
                      <div>Accuracy: ±{accuracy} metres</div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {accuracy && accuracy > 0 && accuracy < 1000 && (
                <Circle
                  center={deviceGpsCoords}
                  radius={accuracy}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.12,
                    weight: 1.5,
                  }}
                />
              )}
            </>
          )}

          {/* Draggable Confirmed Complaint Pin */}
          {selectedCoords && (
            <Marker
              position={selectedCoords}
              icon={createComplaintPinIcon(locationSource === "manual")}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  handleManualLocationChange(ll.lat, ll.lng);
                },
              }}
            >
              <Popup>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                  <strong>📍 Confirmed Complaint Spot</strong>
                  <br />
                  <span>{resolvedAddress || "Selected Location"}</span>
                  <br />
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Lat: {selectedCoords[0].toFixed(6)}, Lng: {selectedCoords[1].toFixed(6)}
                  </span>
                  <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "#047857", fontWeight: "600" }}>
                    ✓ Ready for complaint submission
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Click Handler to allow placing or moving marker anywhere */}
          <MapClickHandler onMapClick={handleManualLocationChange} />
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0.6rem",
          fontSize: "0.78rem",
          color: "#64748b",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", display: "inline-block" }}></span>
            <span>Real GPS Position</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", display: "inline-block" }}></span>
            <span>Complaint Location</span>
          </span>
        </div>
        <span>Drag the pin or tap the map to adjust precisely</span>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
