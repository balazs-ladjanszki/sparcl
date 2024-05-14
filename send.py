import s2sphere
from s2sphere import CellId, LatLng, Cell
import math
import sys
import json
import ast

latitude = 47.47264089476975
longitude = 19.05938926889718
level = 24

cell_id = s2sphere.CellId.from_lat_lng(s2sphere.LatLng.from_degrees(latitude, longitude)).parent(level)
idString = str(cell_id).replace('CellId: ', '')

c1 = Cell(CellId.from_token(idString))

v0 = LatLng.from_point(c1.get_vertex(0)) # lat/lon of upper/left corner
v1 = LatLng.from_point(c1.get_vertex(1)) # lat/lon of lower/left corner
v2 = LatLng.from_point(c1.get_vertex(2)) # lat/lon of lower/right corner
v3 = LatLng.from_point(c1.get_vertex(3)) # lat/lon of upper/right corner

v0 = str(v0).replace('LatLng: ', '')
v1 = str(v1).replace('LatLng: ', '')
v2 = str(v2).replace('LatLng: ', '')
v3 = str(v3).replace('LatLng: ', '')

vertices = {
    "v0Lat": str(v0),
    
    "v1": str(v1),
    "v2": str(v2),
    "v3": str(v3),
}
 
json_object = json.dumps(vertices, indent = 4)
 
# Writing to sample.json
with open("vertices.json", "w") as outfile:
    outfile.write(json_object)