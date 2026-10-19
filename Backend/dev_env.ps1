# dev_env.ps1
# Points PROJ and GDAL at the data folders that come with rasterio.
# Load it into the CURRENT window with a leading dot:  . .\dev_env.ps1

$rio = & .\.venv\Scripts\python.exe -c "import rasterio, pathlib; print(pathlib.Path(rasterio.__file__).parent)"

if (-not (Test-Path "$rio\proj_data")) {
    Write-Host "proj_data not found in $rio" -ForegroundColor Red
    return
}

$env:PROJ_LIB  = "$rio\proj_data"
$env:PROJ_DATA = "$rio\proj_data"
$env:GDAL_DATA = "$rio\gdal_data"
Write-Host "PROJ/GDAL now use: $rio" -ForegroundColor Green