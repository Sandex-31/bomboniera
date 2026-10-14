# Data Cleaning Notebooks

This folder contains Jupyter notebooks for cleaning and preparing the raw CSV datasets before import into PostgreSQL and MongoDB.

## Notebooks

| Notebook | Input CSV(s) | Output CSV |
|---|---|---|
| `Pulizia_movies.ipynb` | `movies.csv` | `moviesCleaned.csv` |
| `Pulizia_actors.ipynb` | `actors.csv` | `actorsCleaned.csv` |
| `Pulizia_Crew.ipynb` | `crew.csv` | `crewCleaned.csv` |
| `Pulizia_releases.ipynb` | `releases.csv` | `releasesCleaned.csv` |
| `Pulizia_studios.ipynb` | `studios.csv` | `studiosCleaned.csv` |
| `Pulizia_Countries_Genres_Languages_Themes.ipynb` | `countries.csv`, `genres.csv`, `languages.csv`, `themes.csv` | individual cleaned CSVs |
| `Pulizia_rottentomatoes_reviews.ipynb` | `rotten_tomatoes_reviews.csv` | `reviewsCleaned.csv` |

## Cleaning Steps

Each notebook follows the same general pipeline:

1. **Load** the raw CSV with Pandas
2. **Type conversion** - cast string columns to `StringDtype` for explicit null handling
3. **Missing values** - drop rows with missing primary keys; fill secondary missing fields (e.g. role → `"Sconosciuto"`)
4. **Special character removal** - strip BOM markers (`﻿`), non-breaking spaces, zero-width characters, soft hyphens, and leading tabs from text fields
5. **Duplicate removal** - drop duplicate rows using composite keys (e.g. `id + name + role`)
6. **Country normalization** - standardize country names using `country_converter` (e.g. `USA` → `United States`)
7. **Export** the cleaned dataframe to a new CSV

## Requirements

Install dependencies with:

```bash
pip install -r requirements.txt
```

CSV files are expected to be located at `C:/CSV/` (adjust the path in each notebook if different).
