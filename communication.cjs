const spawner = require('child_process').spawn;

let lat = 47.47264089476975;
let lon = 19.05938926889718;
let lvl = 24;

const data_to_send = {
    lat: lat,
    lon: lon,
    lvl: lvl,
    v0lat: undefined,
    v0lon: undefined,
    v1lat: undefined,
    v1lon: undefined,
    v2lat: undefined,
    v2lon: undefined,
    v3lat: undefined,
    v3lon: undefined,
};

const python_process = spawner('python3', ['./communication.py', JSON.stringify(data_to_send)]);

python_process.stdout.on('data', (data) => {
    console.log('Data recieved: ', JSON.parse(data));
});