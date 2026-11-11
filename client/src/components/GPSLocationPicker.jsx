import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default marker icon paths in bundled Vite environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Default village / campus coordinates: RGUKT RK Valley, Idupulapaya, Vempalli Mandal, Kadapa District
const IDUPULAPAYA_COORDS = [14.3353, 78.5855];
const IDUPULAPAYA_NAME = "ఇడుపులపాయ / RK Valley (Idupulapaya, Vempalli Mandal, YSR Kadapa District)";

// Component to smoothly pan the map to coordinates
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 17, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Allow villager to tap anywhere on map to drop or adjust the pin
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GPSLocationPicker({ onLocationChange }) {
  const [status, setStatus] = useState("idle"); // idle | detecting | success | denied
  const [coords, setCoords] = useState(null); // [lat, lng]
  const [accuracy, setAccuracy] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [resolvedVillage, setResolvedVillage] = useState("");
  const [isIspGatewayDetected, setIsIspGatewayDetected] = useState(false);
  const timerRef = useRef(null);
  const watchIdRef = useRef(null);

  const notifyParent = useCallback(
    (lat, lng, acc, captured) => {
      if (onLocationChange) {
        onLocationChange({
          latitude: lat,
          longitude: lng,
          location_accuracy: acc,
          location_captured: captured,
        });
      }
    },
    [onLocationChange]
  );

  // Reverse geocode to display village/mandal name in simple words
  const lookupVillageName = async (lat, lng) => {
    // If coords are near Idupulapaya / RK Valley (within 5km), show Idupulapaya directly
    const distToIdupulapaya =
      Math.abs(lat - IDUPULAPAYA_COORDS[0]) + Math.abs(lng - IDUPULAPAYA_COORDS[1]);
    if (distToIdupulapaya < 0.05) {
      setResolvedVillage(IDUPULAPAYA_NAME);
      setIsIspGatewayDetected(false);
      return;
    }

    // Check if detected location is the college ISP network gateway in Ranga Reddy / Hyderabad (lat > 16.5)
    if (lat > 16.5) {
      setIsIspGatewayDetected(true);
    } else {
      setIsIspGatewayDetected(false);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(",").map((s) => s.trim());
          const shortName = parts.slice(0, 3).join(", ");
          setResolvedVillage(shortName);
        }
      }
    } catch {
      // Ignore network errors silently
    }
  };

  // Set location directly to user's real village (Idupulapaya, Vempalli, Kadapa)
  const setIdupulapayaLocation = () => {
    const [lat, lng] = IDUPULAPAYA_COORDS;
    setCoords([lat, lng]);
    setAccuracy(5);
    setStatus("success");
    setResolvedVillage(IDUPULAPAYA_NAME);
    setIsIspGatewayDetected(false);
    notifyParent(lat, lng, 5, true);
  };

  // Dedicated Real-time GPS Detection
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus("detecting");
    setSecondsRemaining(5);

    let bestReading = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestReading || pos.coords.accuracy < bestReading.coords.accuracy) {
          bestReading = pos;
        }
      },
      (err) => {
        console.warn("GPS watch attempt note:", err?.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
    watchIdRef.current = watchId;

    let remaining = 5;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        if (bestReading) {
          const lat = bestReading.coords.latitude;
          const lng = bestReading.coords.longitude;
          const acc = bestReading.coords.accuracy;
          setCoords([lat, lng]);
          setAccuracy(acc);
          setStatus("success");
          notifyParent(lat, lng, acc, true);
          lookupVillageName(lat, lng);
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const acc = pos.coords.accuracy;
              setCoords([lat, lng]);
              setAccuracy(acc);
              setStatus("success");
              notifyParent(lat, lng, acc, true);
              lookupVillageName(lat, lng);
            },
            (err) => {
              console.warn("GPS fallback note:", err?.message);
              setStatus("denied");
              notifyParent(null, null, null, false);
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
          );
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleMarkerMove = (lat, lng) => {
    setCoords([lat, lng]);
    setStatus("success");
    notifyParent(lat, lng, accuracy, true);
    lookupVillageName(lat, lng);
  };

  const handleClear = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCoords(null);
    setAccuracy(null);
    setStatus("idle");
    setResolvedVillage("");
    setIsIspGatewayDetected(false);
    notifyParent(null, null, null, false);
  };

  return (
    <div
      style={{
        margin: "1rem 0",
        padding: "1.2rem",
        background: "#ffffff",
        borderRadius: "14px",
        border: coords ? "2px solid #16a34a" : "2px solid #2563eb",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Title Label */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.4rem" }}>📍</span>
          <div>
            <strong style={{ fontSize: "1.05rem", color: "#0f172a", display: "block" }}>
              సమస్య ఉన్న స్థలాన్ని గుర్తించండి (Mark Problem Location)
            </strong>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              క్రింది బటన్ నొక్కగానే మీ ప్రస్తుత స్థానం స్వయంచాలకంగా నమోదవుతుంది
            </span>
          </div>
        </div>
      </div>

      {/* QUICK 1-TOUCH BUTTON: My Village (Idupulapaya, RK Valley, Kadapa) */}
      <div style={{ marginBottom: "0.75rem" }}>
        <button
          type="button"
          onClick={setIdupulapayaLocation}
          style={{
            width: "100%",
            padding: "0.65rem 1rem",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1.5px dashed #3b82f6",
            borderRadius: "10px",
            fontSize: "0.92rem",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
          }}
        >
          <span>🏫</span>
          <span>ఇడుపులపాయ / RK Valley, కడప (Idupulapaya, Kadapa) కి సెట్ చేయండి</span>
        </button>
      </div>

      {/* PRIMARY GPS DETECT BUTTON */}
      {status !== "detecting" && (
        <button
          type="button"
          onClick={detectLocation}
          style={{
            width: "100%",
            padding: "0.9rem 1.25rem",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>🎯</span>
          <div>
            <div>{coords ? "మళ్ళీ GPS గుర్తించు (Re-detect Live GPS)" : "నా స్థానాన్ని గుర్తించు (Detect My Location)"}</div>
          </div>
        </button>
      )}

      {/* RECORDING / SATELLITE ACQUISITION TIMER STATE */}
      {status === "detecting" && (
        <div
          style={{
            background: "#eff6ff",
            border: "2px solid #93c5fd",
            borderRadius: "12px",
            padding: "1.2rem",
            textAlign: "center",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontSize: "2rem", animation: "pulse 1s infinite" }}>📡</div>
          <h4 style={{ margin: "0.4rem 0", color: "#1e40af", fontSize: "1.05rem" }}>
            మీ ప్రస్తుత స్థానాన్ని రికార్డ్ చేస్తున్నాము...
          </h4>
          <p style={{ margin: "0 0 0.75rem", color: "#475569", fontSize: "0.85rem" }}>
            దయచేసి వేచి ఉండండి: <strong>{secondsRemaining}</strong> సెకన్లు (Recording real-time GPS...)
          </p>
          <div
            style={{
              width: "100%",
              height: "10px",
              background: "#dbeafe",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${((5 - secondsRemaining) / 5) * 100}%`,
                height: "100%",
                background: "#2563eb",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>
      )}

      {/* ISP GATEWAY NOTICE (When computer is on college network routed through Munaganur / Ranga Reddy) */}
      {isIspGatewayDetected && (
        <div
          style={{
            background: "#fef3c7",
            border: "1.5px solid #f59e0b",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ color: "#92400e", fontWeight: "700", fontSize: "0.9rem", marginBottom: "0.3rem" }}>
            ⚠️ కాలేజ్ ఇంటర్నెట్ రౌటర్ స్థానం (Munaganur, Ranga Reddy)
          </div>
          <p style={{ margin: "0 0 0.6rem", color: "#78350f", fontSize: "0.82rem", lineHeight: 1.4 }}>
            మీ కంప్యూటర్ నెట్‌వర్క్ గేట్‌వే హైదరాబాద్/మునగనూరు వద్ద ఉంది. మీరు <strong>ఇడుపులపాయ (RK Valley, కడప)</strong> లో ఉంటే, క్రింది బటన్ నొక్కండి:
          </p>
          <button
            type="button"
            onClick={setIdupulapayaLocation}
            style={{
              padding: "0.5rem 1rem",
              background: "#d97706",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            📍 ఇడుపులపాయ / RK Valley కి మార్చండి (Switch to Idupulapaya)
          </button>
        </div>
      )}

      {/* SUCCESS CONFIRMATION BOX */}
      {status === "success" && coords && (
        <div style={{ marginBottom: "0.85rem" }}>
          <div
            style={{
              background: "#f0fdf4",
              border: "1.5px solid #86efac",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <div style={{ color: "#166534", fontWeight: "700", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>✅</span> ప్రస్తుత స్థానం రికార్డ్ చేయబడింది! (Location Recorded)
              </div>
              {resolvedVillage && (
                <div style={{ fontSize: "0.88rem", color: "#15803d", fontWeight: "600", marginTop: "0.25rem" }}>
                  📍 {resolvedVillage}
                </div>
              )}
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                అక్షాంశం (Lat): {coords[0].toFixed(6)}, రేఖాంశం (Lng): {coords[1].toFixed(6)}
                {accuracy && <span> • ఖచ్చితత్వం: ±{Math.round(accuracy)}m</span>}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: "0.45rem 0.85rem",
                  background: "#fee2e2",
                  color: "#991b1b",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ✕ తొలగించు
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SATELLITE MAP VISUALIZATION - Centered on Idupulapaya / RK Valley */}
      <div style={{ marginTop: "0.75rem" }}>
        <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "0.4rem", display: "flex", justifyContent: "space-between" }}>
          <span>
            🛰️ <strong>ఇడుపులపాయ / RK Valley శాటిలైట్ మ్యాప్:</strong>
          </span>
          <span style={{ color: "#64748b" }}>
            మ్యాప్‌పై తాకి పిన్‌ను సరిగ్గా ఉంచవచ్చు (Tap map to move pin)
          </span>
        </div>

        <div
          style={{
            height: "340px",
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            border: "2px solid #cbd5e1",
            position: "relative",
            zIndex: 1,
          }}
        >
          <MapContainer
            center={coords || IDUPULAPAYA_COORDS}
            zoom={coords ? 17 : 16}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            {/* Esri World Imagery (Satellite Photos showing campus buildings, hostels, academic blocks, and roads) */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri Satellite</a>'
              maxZoom={19}
            />

            {coords && <MapCenterController center={coords} />}

            {coords && (
              <Marker
                position={coords}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    handleMarkerMove(ll.lat, ll.lng);
                  },
                }}
              />
            )}

            <MapClickHandler onMapClick={handleMarkerMove} />
          </MapContainer>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
