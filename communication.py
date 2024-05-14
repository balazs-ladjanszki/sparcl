import s2sphere
from s2sphere import CellId, LatLng, Cell
import sys
import json
import ast

input = ast.literal_eval(sys.argv[1])

latitude = input['lat']
longitude = input['lon']
level = input['lvl']

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

output = input

output['v0lat'] = v0.split(',')[0]
output['v0lon'] = v0.split(',')[1]
output['v1lat'] = v1.split(',')[0]
output['v1lon'] = v1.split(',')[1]
output['v2lat'] = v2.split(',')[0]
output['v2lon'] = v2.split(',')[1]
output['v3lat'] = v3.split(',')[0]
output['v3lon'] = v3.split(',')[1]
 
print(json.dumps(output))

sys.stdout.flush()