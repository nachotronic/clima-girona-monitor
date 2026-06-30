const GIRONA_CENTER = [42.05, 2.65];
const GIRONA_ZOOM = 9;

const map = L.map('map', { zoomControl: true }).setView(GIRONA_CENTER, GIRONA_ZOOM);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  maxZoom: 18,
}).addTo(map);

let municipisLayer = null;
let currentData = null;

function anomaliaColor(value) {
  // Escala discreta -3 a +6, alineada amb la llegenda del frontend.
  if (value === null || value === undefined || Number.isNaN(value)) return '#cccccc';
  if (value <= -2) return '#378ADD';
  if (value <= -1) return '#85B7EB';
  if (value <= 0) return '#B5D4F4';
  if (value <= 1) return '#FAEEDA';
  if (value <= 2) return '#FAC775';
  if (value <= 3) return '#F0997B';
  if (value <= 4) return '#D85A30';
  if (value <= 5) return '#993C1D';
  return '#712B13';
}

function qualityLabel(q) {
  if (q === 'bona') return { text: 'Qualitat bona', cls: 'quality-bona', icon: '✓' };
  if (q === 'moderada') return { text: 'Qualitat moderada', cls: 'quality-moderada', icon: '!' };
  return { text: 'Qualitat baixa', cls: 'quality-baixa', icon: '!' };
}

function renderPanel(props) {
  const panel = document.getElementById('panel');
  const q = qualityLabel(props.quality);

  let reasonsText = '';
  if (props.quality_reasons && props.quality_reasons.length) {
    const labels = {
      poques_celles: 'poques cel·les ERA5-Land',
      alta_variabilitat_altitudinal: 'alta variabilitat altitudinal',
      dades_incompletes: 'cobertura de dades incompleta',
    };
    reasonsText = props.quality_reasons.map(r => labels[r] || r).join(', ');
  }

  panel.innerHTML = `
    <h2>${props.municipi}</h2>
    <p class="comarca">${props.comarca}</p>

    <div class="panel-row"><span>Tmax recent</span><span>${props.tmax_recent.toFixed(1)}°C</span></div>
    <div class="panel-row"><span>Normal 1991-2020</span><span>${props.tmax_normal.toFixed(1)}°C</span></div>
    <div class="panel-row"><span>Normal 1961-1990</span><span>${props.tmax_normal_1961_1990.toFixed(1)}°C</span></div>

    <div class="panel-anomaly">
      <div class="panel-row"><span>Anomalia (1991-2020)</span></div>
      <div class="panel-anomaly-value">${props.anomalia >= 0 ? '+' : ''}${props.anomalia.toFixed(1)}°C</div>
      <div class="panel-anomaly-alt">vs. 1961-1990: ${props.anomalia_1961_1990 >= 0 ? '+' : ''}${props.anomalia_1961_1990.toFixed(1)}°C</div>
    </div>

    <div class="quality-badge ${q.cls}">
      <span>${q.icon}</span>
      <span>${q.text}${reasonsText ? ' · ' + reasonsText : ''}</span>
    </div>
  `;
}

function styleFeature(feature) {
  return {
    fillColor: anomaliaColor(feature.properties.anomalia),
    weight: 1,
    color: '#ffffff',
    fillOpacity: 0.85,
  };
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: (e) => {
      e.target.setStyle({ weight: 2, color: '#2c2c2a' });
      renderPanel(feature.properties);
    },
    mouseout: (e) => {
      e.target.setStyle({ weight: 1, color: '#ffffff' });
    },
    click: (e) => {
      renderPanel(feature.properties);
      map.fitBounds(e.target.getBounds(), { maxZoom: 11 });
    },
  });
}

function loadMunicipisLayer(geojson) {
  if (municipisLayer) {
    map.removeLayer(municipisLayer);
  }
  municipisLayer = L.geoJSON(geojson, {
    style: styleFeature,
    onEachFeature: onEachFeature,
  }).addTo(map);
}

function updateHeader(meta) {
  const subtitle = document.getElementById('header-subtitle');
  subtitle.textContent = `Anomalia Tmax · ${meta.date} · ref. ${meta.reference_period_main} (alt. ${meta.reference_period_alt})`;
}

async function init() {
  try {
    const res = await fetch('data/latest_municipis.geojson');
    const geojson = await res.json();
    currentData = geojson;
    loadMunicipisLayer(geojson);
    updateHeader(geojson.metadata);
  } catch (err) {
    document.getElementById('header-subtitle').textContent = 'No s\'han pogut carregar les dades.';
    console.error(err);
  }
}

document.getElementById('btn-municipis').addEventListener('click', (e) => {
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  if (currentData) loadMunicipisLayer(currentData);
});

document.getElementById('btn-malla').addEventListener('click', (e) => {
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  // Capa de malla/camp continu: pendent de connectar amb data/latest_grid.geojson
  // o amb el raster interpolat (PNG georreferenciat) un cop generat pel pipeline.
  alert('Capa de malla climàtica: pendent de connectar amb la sortida del pipeline (grid o raster interpolat).');
});

init();
