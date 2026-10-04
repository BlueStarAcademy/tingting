import { formatMeters, formatMinutes, type CourseDay } from '@tingting/shared';
import { SLOT_STYLE } from '@/components/course/course-style';
import { theme } from '@/constants/theme';

export interface RouteMapData {
  start?: { name: string; lat: number; lng: number };
  stops: { name: string; lat: number; lng: number; n: number; color: string }[];
  /** `path` is [lat, lng] pairs (as in RouteLeg); estimated legs are drawn as dashed straight lines */
  legs: { path: [number, number][]; estimated: boolean; label: string }[];
  selected: number | null;
  /** Changes whenever the stops change, so the map refits instead of just panning */
  fitKey: string;
  lineColor: string;
}

export function routeMapData(day: CourseDay | undefined, selected: number | null): RouteMapData {
  if (!day) return { stops: [], legs: [], selected: null, fitKey: 'empty', lineColor: theme.colors.primary };
  const points = [day.start, ...day.stops.map((s) => s.place)];
  return {
    start: day.start,
    stops: day.stops.map((s, i) => ({ name: s.place.name, lat: s.place.lat, lng: s.place.lng, n: i + 1, color: SLOT_STYLE[s.slot].color })),
    legs: day.stops.map((s, i) => {
      const from = points[i];
      const leg = s.leg;
      const estimated = !leg || leg.source === 'estimate';
      const path: [number, number][] =
        leg?.path && leg.path.length > 1 ? leg.path : [[from.lat, from.lng], [s.place.lat, s.place.lng]];
      const label = leg ? `${estimated ? '약 ' : ''}${formatMinutes(leg.durationMin)} · ${formatMeters(leg.distanceM)}` : '';
      return { path, estimated, label };
    }),
    selected,
    fitKey: `${day.day}:${day.start.lat},${day.start.lng}:${day.stops.map((s) => s.key).join(',')}`,
    lineColor: theme.colors.primary,
  };
}

/**
 * Self-contained Leaflet page (OpenStreetMap tiles; no API key). Data arrives through
 * `window.__setData(...)` or a `{ __routeMapData }` message; pin taps are posted back as
 * `{ type: 'stop', index }` to React Native (ReactNativeWebView) or the parent window (web iframe).
 */
export const ROUTE_MAP_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F3DCE0; }
  .leaflet-container { font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', Roboto, sans-serif; }
  .pin { width: 28px; height: 28px; border-radius: 14px; border: 2.5px solid #fff; color: #fff; font: 800 13px/23px sans-serif;
    text-align: center; box-shadow: 0 2px 6px rgba(45,31,36,.35); box-sizing: border-box; transition: transform .15s; }
  .pin.sel { transform: scale(1.3); box-shadow: 0 0 0 4px rgba(45,31,36,.25), 0 2px 6px rgba(45,31,36,.35); }
  .start { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; height: 24px; padding: 0 8px; border-radius: 12px;
    background: #2D1F24; border: 2px solid #fff; color: #fff; font: 800 11px/20px sans-serif; box-sizing: border-box;
    box-shadow: 0 2px 6px rgba(45,31,36,.35); }
  .leg { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; background: rgba(255,252,251,.95);
    color: #2D1F24; border: 1px solid rgba(120,60,72,.18); border-radius: 10px; padding: 2px 7px; font: 700 11px/16px sans-serif;
    box-shadow: 0 1px 4px rgba(45,31,36,.15); pointer-events: none; }
  .msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #7A5F66;
    font: 600 14px sans-serif; text-align: center; padding: 24px; }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>if (!window.L) document.write('<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"><\\/script>');</script>
<script>
(function () {
  var map = null, layer = null, data = null, lastFit = null, pins = [], labels = [];
  function post(msg) {
    var text = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent && window.parent !== window) window.parent.postMessage({ __routeMap: msg }, '*');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render(d) {
    data = d;
    if (!map) return;
    // The frame can still be 0×0 on first layout; fitting then breaks the view, so wait for a resize.
    map.invalidateSize(false);
    var size = map.getSize();
    if (!size.x || !size.y) { lastFit = null; return; }
    layer.clearLayers();
    pins = [];
    labels = [];
    var bounds = [];
    d.legs.forEach(function (leg) {
      var line = leg.path;
      L.polyline(line, { color: '#fff', weight: 8, opacity: 0.9 }).addTo(layer);
      L.polyline(line, { color: d.lineColor, weight: 4.5, opacity: 0.95, dashArray: leg.estimated ? '7 9' : null }).addTo(layer);
      line.forEach(function (p) { bounds.push(p); });
      if (leg.label) {
        var mid = line[Math.floor(line.length / 2)];
        if (line.length === 2) mid = [(line[0][0] + line[1][0]) / 2, (line[0][1] + line[1][1]) / 2];
        var label = L.marker(mid, { icon: L.divIcon({ className: '', html: '<div class="leg">' + esc(leg.label) + '</div>', iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(layer);
        labels.push({ marker: label, a: line[0], b: line[line.length - 1] });
      }
    });
    if (d.start) {
      L.marker([d.start.lat, d.start.lng], { icon: L.divIcon({ className: '', html: '<div class="start">출발</div>', iconSize: [0, 0] }), keyboard: false })
        .bindTooltip(esc(d.start.name), { direction: 'top', offset: [0, -12] }).addTo(layer);
      bounds.push([d.start.lat, d.start.lng]);
    }
    d.stops.forEach(function (s, i) {
      var sel = d.selected === i;
      var m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: '', html: '<div class="pin' + (sel ? ' sel' : '') + '" style="background:' + s.color + '">' + s.n + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] }),
        zIndexOffset: sel ? 1000 : i, keyboard: false
      }).bindTooltip(esc(s.name), { direction: 'top', offset: [0, -14] }).addTo(layer);
      m.on('click', function () { post({ type: 'stop', index: i }); });
      pins.push(m);
      bounds.push([s.lat, s.lng]);
    });
    if (lastFit !== d.fitKey && bounds.length) {
      lastFit = d.fitKey;
      if (bounds.length === 1) map.setView(bounds[0], 14);
      else map.fitBounds(bounds, { padding: [34, 34], maxZoom: 15 });
    } else if (d.selected != null && d.stops[d.selected]) {
      var s = d.stops[d.selected];
      if (!map.getBounds().pad(-0.15).contains([s.lat, s.lng])) map.panTo([s.lat, s.lng]);
    }
    updateLabels();
  }
  // Leg labels only where the leg is long enough on screen not to cover the pins; zoom in for the rest.
  function updateLabels() {
    labels.forEach(function (l) {
      var el = l.marker.getElement();
      if (!el) return;
      var px = map.latLngToContainerPoint(l.a).distanceTo(map.latLngToContainerPoint(l.b));
      el.style.display = px > 110 ? '' : 'none';
    });
  }
  window.__setData = render;
  window.addEventListener('resize', function () {
    if (!map) return;
    map.invalidateSize(false);
    if (data) { lastFit = null; render(data); }
  });
  function onMessage(e) {
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { return; } }
    if (d && d.__routeMapData) render(d.__routeMapData);
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);
  if (!window.L) {
    document.getElementById('map').innerHTML = '<div class="msg">지도를 불러오지 못했어요.<br/>인터넷 연결을 확인해 주세요.</div>';
    post({ type: 'error' });
    return;
  }
  map = L.map('map', { zoomControl: false, attributionControl: true });
  map.attributionControl.setPrefix(false);
  // OpenStreetMap's own tiles (Korean labels); its servers need the Referer the page sends.
  // After a few failures switch to the OSM France humanitarian style, also keyless.
  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var tileErrors = 0;
  tiles.on('tileerror', function () {
    if (++tileErrors !== 3) return;
    map.removeLayer(tiles);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      subdomains: 'abc', maxZoom: 19, attribution: '&copy; OpenStreetMap contributors, Tiles: OSM France'
    }).addTo(map);
  });
  layer = L.layerGroup().addTo(map);
  map.on('zoomend', updateLabels);
  map.setView([36.4, 127.9], 7, { animate: false });
  if (data) render(data);
  post({ type: 'ready' });
})();
</script>
</body></html>`;
