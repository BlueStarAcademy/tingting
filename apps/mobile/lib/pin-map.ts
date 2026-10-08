import { getCityPinCategory, type CityInfo, type CityPin } from '@tingting/shared';
import { cityOutlineLatLng } from '@/lib/city-map';

export interface PinMapData {
  pins: { id: string; name: string; lat: number; lng: number; emoji: string; color: string }[];
  /** Municipality outline as [lat, lng] rings */
  outline: [number, number][][];
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  selected: string | null;
  /** Spot picked by long-press, not saved yet */
  draft: { lat: number; lng: number } | null;
  /** Changes when the map should refit (pins added/removed, another city) */
  fitKey: string;
}

export function pinMapData(city: CityInfo, pins: CityPin[], selected: string | null, draft: PinMapData['draft']): PinMapData {
  return {
    pins: pins.map((p) => {
      const cat = getCityPinCategory(p.category);
      return { id: p.id, name: p.name, lat: p.lat, lng: p.lng, emoji: cat.emoji, color: cat.color };
    }),
    outline: cityOutlineLatLng(city.regionCode, city.code),
    bbox: city.bbox,
    selected,
    draft,
    fitKey: `${city.code}:${pins.map((p) => p.id).join(',')}`,
  };
}

export type PinMapMessage =
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'pin'; id: string }
  | { type: 'longpress'; lat: number; lng: number }
  | { type: 'tap' };

/**
 * Leaflet page for a city folder: the municipality outline, saved pins (category emoji) and a
 * draft spot. Long-press (or right-click on web) posts `{ type: 'longpress', lat, lng }`.
 * Same transport as ROUTE_MAP_HTML: `window.__setData(...)` / `{ __pinMapData }` in,
 * ReactNativeWebView or parent `{ __pinMap }` messages out.
 */
export const PIN_MAP_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F3DCE0; }
  .leaflet-container { font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', Roboto, sans-serif; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  .mk { position: relative; width: 34px; height: 34px; border-radius: 17px 17px 17px 4px; transform: rotate(-45deg); border: 2.5px solid #fff;
    box-sizing: border-box; box-shadow: 0 2px 6px rgba(45,31,36,.35); transition: transform .15s; }
  .mk span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(45deg); font-size: 15px; line-height: 1; }
  .mk.sel { transform: rotate(-45deg) scale(1.25); box-shadow: 0 0 0 4px rgba(45,31,36,.22), 0 2px 6px rgba(45,31,36,.35); }
  .draft { width: 22px; height: 22px; border-radius: 11px; background: #2D1F24; border: 3px solid #fff; box-sizing: border-box;
    box-shadow: 0 0 0 0 rgba(224,96,126,.6); animation: pulse 1.4s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(224,96,126,.6); } 70% { box-shadow: 0 0 0 16px rgba(224,96,126,0); } 100% { box-shadow: 0 0 0 0 rgba(224,96,126,0); } }
  .leaflet-tooltip.nm { background: rgba(255,252,251,.96); border: 1px solid rgba(120,60,72,.18); border-radius: 9px; color: #2D1F24;
    font: 700 11px/15px sans-serif; padding: 2px 7px; box-shadow: 0 1px 4px rgba(45,31,36,.15); }
  .leaflet-tooltip.nm:before { display: none; }
  .msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #7A5F66;
    font: 600 14px sans-serif; text-align: center; padding: 24px; }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>if (!window.L) document.write('<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"><\\/script>');</script>
<script>
(function () {
  var map = null, layer = null, outlineLayer = null, data = null, lastFit = null, lastOutline = null, markers = [];
  function post(msg) {
    var text = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent && window.parent !== window) window.parent.postMessage({ __pinMap: msg }, '*');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bboxBounds(b) { return [[b[1], b[0]], [b[3], b[2]]]; }
  function render(d) {
    data = d;
    if (!map) return;
    map.invalidateSize(false);
    var size = map.getSize();
    if (!size.x || !size.y) { lastFit = null; return; }
    var outlineKey = d.fitKey.split(':')[0];
    if (lastOutline !== outlineKey) {
      lastOutline = outlineKey;
      outlineLayer.clearLayers();
      if (d.outline.length) L.polygon(d.outline, { color: '#B8435F', weight: 2, opacity: 0.8, dashArray: '6 6', fillColor: '#E0607E', fillOpacity: 0.05, interactive: false }).addTo(outlineLayer);
    }
    layer.clearLayers();
    markers = [];
    var bounds = [];
    d.pins.forEach(function (p, i) {
      var sel = d.selected === p.id;
      var m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: '<div class="mk' + (sel ? ' sel' : '') + '" style="background:' + p.color + '"><span>' + p.emoji + '</span></div>', iconSize: [34, 34], iconAnchor: [17, 40] }),
        zIndexOffset: sel ? 1000 : i, keyboard: false
      }).bindTooltip(esc(p.name), { direction: 'bottom', offset: [0, 0], permanent: true, className: 'nm' }).addTo(layer);
      m.on('click', function (e) { if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); post({ type: 'pin', id: p.id }); });
      markers.push(m);
      bounds.push([p.lat, p.lng]);
    });
    if (d.draft) {
      L.marker([d.draft.lat, d.draft.lng], { icon: L.divIcon({ className: '', html: '<div class="draft"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, keyboard: false, zIndexOffset: 2000 }).addTo(layer);
    }
    if (lastFit !== d.fitKey) {
      lastFit = d.fitKey;
      if (bounds.length === 1) map.setView(bounds[0], 15);
      else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      else map.fitBounds(bboxBounds(d.bbox), { padding: [10, 10] });
    } else {
      var focus = d.draft ? [d.draft.lat, d.draft.lng] : null;
      if (!focus && d.selected) d.pins.forEach(function (p) { if (p.id === d.selected) focus = [p.lat, p.lng]; });
      if (focus && !map.getBounds().pad(-0.15).contains(focus)) map.panTo(focus);
    }
    updateLabels();
  }
  // Names only once zoomed in enough that they don't pile up.
  function updateLabels() {
    var show = map.getZoom() >= 13 || markers.length <= 3;
    markers.forEach(function (m) { var t = m.getTooltip(); if (t && t.getElement()) t.getElement().style.display = show ? '' : 'none'; });
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
    if (d && d.__pinMapData) render(d.__pinMapData);
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
  outlineLayer = L.layerGroup().addTo(map);
  layer = L.layerGroup().addTo(map);
  map.on('zoomend', updateLabels);

  // Long-press: own timer on touch (WebViews differ on contextmenu), contextmenu for mouse.
  var holdTimer = null, holdStart = null, lastHold = 0;
  function fireHold(latlng) {
    var now = Date.now();
    if (now - lastHold < 800) return;
    lastHold = now;
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
    post({ type: 'longpress', lat: latlng.lat, lng: latlng.lng });
  }
  function cancelHold() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }
  var el = map.getContainer();
  el.addEventListener('touchstart', function (e) {
    cancelHold();
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    if (t.target && t.target.closest && t.target.closest('.leaflet-marker-icon')) return;
    holdStart = { x: t.clientX, y: t.clientY };
    holdTimer = setTimeout(function () {
      holdTimer = null;
      var rect = el.getBoundingClientRect();
      fireHold(map.containerPointToLatLng([holdStart.x - rect.left, holdStart.y - rect.top]));
    }, 550);
  }, { passive: true });
  el.addEventListener('touchmove', function (e) {
    if (!holdTimer || !holdStart) return;
    var t = e.touches[0];
    if (e.touches.length !== 1 || Math.abs(t.clientX - holdStart.x) > 10 || Math.abs(t.clientY - holdStart.y) > 10) cancelHold();
  }, { passive: true });
  el.addEventListener('touchend', cancelHold, { passive: true });
  el.addEventListener('touchcancel', cancelHold, { passive: true });
  map.on('contextmenu', function (e) { fireHold(e.latlng); });
  map.on('click', function () { post({ type: 'tap' }); });

  map.setView([36.4, 127.9], 7, { animate: false });
  if (data) render(data);
  post({ type: 'ready' });
})();
</script>
</body></html>`;
