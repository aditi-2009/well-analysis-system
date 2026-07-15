import geopandas as gpd

# Path to your shapefile
shapefile_path = r"data/shapefiles/Wardha_Arvi_Deoli_Well.shp"

# Read the shapefile
wells = gpd.read_file(shapefile_path)

# Print basic information
print("Shapefile loaded successfully!")
print("\nFirst 5 records:")
print(wells.head())

print("\nNumber of wells:")
print(len(wells))

print("\nCoordinate Reference System (CRS):")
print(wells.crs)

print("\nGeometry Type:")
print(wells.geom_type.unique())