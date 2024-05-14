
import s2sphere
from s2sphere import CellId, LatLng, Cell

def get_corners(s2CellId_str, level):
    c1 = Cell(CellId.from_token(s2CellId_str))

    print(c1)

    c0 = LatLng.from_point(c1.get_center())  # center lat/lon of s2 cell
    v0 = LatLng.from_point(c1.get_vertex(0)) # lat/lon of upper/left corner
    v1 = LatLng.from_point(c1.get_vertex(1)) # lat/lon of lower/left corner
    v2 = LatLng.from_point(c1.get_vertex(2)) # lat/lon of lower/right corner
    v3 = LatLng.from_point(c1.get_vertex(3)) # lat/lon of upper/right corner
    print('    // s2 level ' + str(level) + ' cell id = ' + s2CellId_str)
    print(str(c0).split(',')[1])
    print('Vertex0 = ' + str(v0))
    print('Vertex1 = ' + str(v1))
    print('Vertex2 = ' + str(v2))
    print('Vertex3 = ' + str(v3))

lat = 47.47264089476975
lng = 19.05938926889718
cell_id = s2sphere.CellId.from_lat_lng(s2sphere.LatLng.from_degrees(lat,lng)).parent(24)
modified_string = str(cell_id).replace('CellId: ', '')
print(cell_id)
get_corners(modified_string, 24)
#print(CellId.from_token("5134628773132587008"))