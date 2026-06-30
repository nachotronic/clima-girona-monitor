# Monitor climàtic — Girona

Mapa municipal de la província de Girona que mostra l'anomalia de
temperatura màxima diària respecte a la normal climàtica, inspirat en el
Reuters Climate Monitor.

## Estat actual

Aquest repositori conté l'esquelet complet del projecte amb dades
d'exemple a `data/latest_municipis.geojson`, perquè el frontend funcioni
des del primer moment. **El pipeline real (descàrrega ERA5-Land, càlcul de
climatologia i agregació municipal) encara s'ha de validar amb dades
reals abans de connectar-lo en producció.**

## Metodologia (resum)

- Font: ERA5-Land (temperatura horària 2m, ~9 km de resolució).
- Normal de referència: 1991-2020 (estàndard OMM actual). Es mostra també
  la comparació amb 1961-1990 com a referència addicional.
- Climatologia diària suavitzada amb finestra mòbil de ±15 dies.
- Anomalia calculada sobre el dia anterior (no "avui"), per evitar
  problemes de disponibilitat del reanàlisi en temps real.
- Agregació municipal ponderada per àrea d'intersecció cel·la–municipi
  (no per centroide).
- Categoria de qualitat automàtica (bona/moderada/baixa) segons nombre de
  cel·les, variabilitat altitudinal i cobertura de dades vàlides.

## Estructura

```
clima-girona-monitor/
├─ index.html / style.css / app.js       Frontend (Leaflet)
├─ data/
│  ├─ municipis_girona.geojson           Geometries municipals (a afegir)
│  ├─ latest_municipis.geojson           Sortida diària (dades d'exemple ara mateix)
│  ├─ latest_summary.json                Resum diari
│  ├─ history/                           Històric append-only, un fitxer per dia
│  ├─ climatology_era5land_*.parquet     Climatologia precalculada (a generar en local)
│  └─ weights_municipi_cell.parquet      Taula de pesos (a generar en local)
├─ scripts/
│  ├─ 01_build_climatology.py            Es corre en local, no a Actions
│  ├─ build_weights.py                   Es corre una sola vegada
│  ├─ 02_fetch_recent_era5land.py        Descàrrega diària via CDS
│  ├─ 03_calculate_anomalies.py          Anomalia per cel·la
│  ├─ 04_aggregate_to_municipalities.py  Agregació ponderada + qualitat
│  └─ 05_build_outputs.py                Genera els fitxers finals + històric
└─ .github/workflows/update.yml          Automatització diària
```

## Passos pendents abans de producció

1. Afegir `data/municipis_girona.geojson` amb les geometries reals
   (ICGC o IGN, simplificades / en TopoJSON si cal alleugerir).
2. Descarregar ERA5-Land 1991-2020 (i 1961-1990) i córrer
   `01_build_climatology.py` en local per generar les climatologies.
3. Córrer `build_weights.py` una vegada per generar la taula de pesos.
4. Generar `data/municipis_meta.parquet` amb `municipi_id`, nom, comarca
   i `altitude_range` (a partir d'un MDT, p. ex. ICGC).
5. Configurar el secret `CDS_API_KEY` al repositori de GitHub.
6. Provar el workflow manualment (`workflow_dispatch`) abans d'activar el
   cron.

## Desenvolupament local del frontend

No cal cap servidor especial, però per evitar problemes de CORS amb
`fetch()` és millor servir els fitxers amb un servidor estàtic senzill:

```bash
python -m http.server 8000
```

I obrir `http://localhost:8000`.
