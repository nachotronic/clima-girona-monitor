"""
download_historical_era5land.py

Descarrega temperatura horaria 2m d'ERA5-Land per a un periode historic
llarg (p. ex. 1991-2020), per construir la climatologia amb
01_build_climatology.py.

IMPORTANT: aixo es una descarrega GRAN (30 anys x 12 mesos = 360
sol·licituds, o menys si s'agrupen). Es normal que trigui hores, ja que
CDS posa les peticions en cua. Es pensat per executar-se EN LOCAL, no dins
de GitHub Actions.

Es descarrega un fitxer NetCDF per any (no per dia), per reduir el nombre
de peticions i aprofitar millor la cua de CDS.

US:
    python download_historical_era5land.py --start-year 1991 --end-year 2020

Requereix: cdsapi (i ~/.cdsapirc configurat amb la API key)
"""

import argparse
import time
from pathlib import Path

import cdsapi

OUTPUT_DIR = Path("data/raw_historical")

# Area aproximada de la provincia de Girona (N, W, S, E)
GIRONA_BBOX = [42.55, 2.05, 41.65, 3.35]

ALL_MONTHS = [f"{m:02d}" for m in range(1, 13)]
ALL_DAYS = [f"{d:02d}" for d in range(1, 32)]
ALL_HOURS = [f"{h:02d}:00" for h in range(24)]


def download_year(client: cdsapi.Client, year: int, max_retries: int = 3) -> Path:
    out_path = OUTPUT_DIR / f"era5land_{year}.nc"

    if out_path.exists():
        print(f"[{year}] Ja existeix, s'omet.")
        return out_path

    for attempt in range(1, max_retries + 1):
        try:
            print(f"[{year}] Sol·licitant a CDS (intent {attempt}/{max_retries})...")
            client.retrieve(
                "reanalysis-era5-land",
                {
                    "variable": "2m_temperature",
                    "year": str(year),
                    "month": ALL_MONTHS,
                    "day": ALL_DAYS,
                    "time": ALL_HOURS,
                    "area": GIRONA_BBOX,
                    "format": "netcdf",
                },
                str(out_path),
            )
            print(f"[{year}] Descarrega completada: {out_path}")
            return out_path
        except Exception as exc:
            print(f"[{year}] Error a l'intent {attempt}: {exc}")
            if attempt < max_retries:
                wait = 60 * attempt
                print(f"[{year}] Reintentant en {wait}s...")
                time.sleep(wait)
            else:
                print(f"[{year}] S'ha esgotat el nombre d'intents. Es continua amb el seguent any.")
                raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client()

    failed_years = []
    for year in range(args.start_year, args.end_year + 1):
        try:
            download_year(client, year)
        except Exception:
            failed_years.append(year)

    print("\nResum:")
    print(f"  Anys correctes: {args.end_year - args.start_year + 1 - len(failed_years)}")
    if failed_years:
        print(f"  Anys amb error (cal repetir): {failed_years}")
        print(f"  Per reintentar nomes aquests anys, torna a executar el script amb")
        print(f"  --start-year i --end-year ajustats, o esborra manualment i repeteix.")
    else:
        print("  Tots els anys descarregats correctament.")
        print(f"\nSeguent pas: python scripts/01_build_climatology.py --period 1991_2020 \\")
        print(f"  --input-glob \"{OUTPUT_DIR}/era5land_*.nc\"")


if __name__ == "__main__":
    main()
