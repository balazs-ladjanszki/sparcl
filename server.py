from flask import Flask, request, jsonify, make_response
import s2sphere
from s2sphere import CellId, LatLng, Cell

from flask_cors import cross_origin # we need to add CORS headers to be able to use WebApp clients


app = Flask(__name__)


# handle CORS preflight which is sent as an OPTIONS request
@app.route('/getPoints', methods=['OPTIONS'])
@cross_origin() # we need to add CORS headers to be able to use WebApp clients
def geoposeOptions():
    response = make_response()
    # simply allow everything
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

@app.route('/getPoints')
@cross_origin() # we need to add CORS headers to be able to use WebApp clients
def Points():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    lvl = request.args.get('lvl')

    lat = float(lat)
    lon = float(lon)
    lvl = int(lvl)

    cell_id = s2sphere.CellId.from_lat_lng(s2sphere.LatLng.from_degrees(lat, lon)).parent(lvl)
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

    data = {
        'v0lat' : v0.split(',')[0],
        'v0lon' : v0.split(',')[1],
        'v1lat' : v1.split(',')[0],
        'v1lon' : v1.split(',')[1],
        'v2lat' : v2.split(',')[0],
        'v2lon' : v2.split(',')[1],
        'v3lat' : v3.split(',')[0],
        'v3lon' : v3.split(',')[1],
    }

    return jsonify(data) , 200

if __name__ == '__main__':
    #my_ssl_context = ('C:/Program Files/Git/usr/bin/cert.pem', 'C:/Program Files/Git/usr/bin/key.pem')
    my_ssl_context=None
    my_port = 8036
    app.run(debug = True, host = '0.0.0.0', port = my_port, ssl_context=my_ssl_context)

