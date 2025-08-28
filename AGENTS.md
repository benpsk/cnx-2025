# Repository Guidelines

## Project Structure & Assets
- Root assets live in `images/` (JPEGs). Organize by trip when helpful, e.g., `images/2024-iceland/`.
- Prefer descriptive, sortable filenames: `YYYYMMDD_location_subject.jpg` (lowercase, hyphens, no spaces), e.g., `20240915-reykjavik-harbor.jpg`.
- Keep only final exports; avoid RAW or PSD. Remove duplicates and near-duplicates.

## Build, Test, and Development Commands
- Optimize images (example): `mogrify -strip -resize '2000x2000>' -quality 85 images/**/*.jpg`.
- Check EXIF/GPS (example): `exiftool -gps* -time:* images/file.jpg`.
- Generate quick contact sheet (optional): `montage images/*.jpg -geometry 200x200+2+2 contact-sheet.jpg`.
Note: There is no formal build; commands above are suggestions for quality control before committing.

## Coding Style & Naming Conventions
- Filenames: lowercase, hyphen-separated; use `.jpg` extension; keep subjects concise.
- Directories: group by date-range or location for large trips (e.g., `images/2024-iceland/day-01/`).
- Image format: JPEG sRGB. Aim for ≤ 2000px longest edge and ~200–500KB per image when feasible.

## Testing Guidelines
- No test suite. Please self-check before PRs:
  - Dimensions within target bounds; images load locally.
  - No sensitive EXIF (GPS, serials) unless explicitly intended.
  - Reasonable file sizes; avoid adding oversized originals.
  - Consistent naming and directory placement.

## Commit & Pull Request Guidelines
- Commits: clear, scoped messages. Format: `images: add 2024-09 iceland day-01 harbor set`.
- PRs should include:
  - Summary of trip/date/location and purpose of change.
  - Counts of added/removed files and any reorganizations.
  - Representative thumbnails or filenames in the description.
  - Note any intentional EXIF retention (e.g., GPS) or deviations from size rules.

## Security & Configuration Tips
- Strip sensitive metadata unless required: `exiftool -all= -tagsFromFile @ -DateTimeOriginal -Artist file.jpg`.
- Consider Git LFS for future large additions; avoid committing RAW/video here.
- Keep repository history clean: squash fix-up commits where practical.

