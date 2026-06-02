const HEADERS = { "User-Agent": "weather-demo (you@example.com)" };
const fetchJSON = (url) =>
  fetch(url, { headers: HEADERS }).then((r) => r.json());

fetchJSON("https://api.weather.gov/points/40.99,-73.78")
  .then((points) =>
    fetchJSON(points.properties.forecast)
      .then((forecast) =>
        fetchJSON(points.properties.observationStations)
          .then((stationsData) => {
            const station = stationsData.features[0];
            return fetchJSON(`${station.id}/observations/latest`).then(
              (obs) => ({
                city: points.properties.relativeLocation.properties.city,
                tonight: forecast.properties.periods[0].detailedForecast,
                stationName: station.properties.name,
                tempC: obs.properties.temperature.value,
              }),
            );
          }),
      ),
  )
  .then((report) => console.log(report))
  .catch(console.error);

// or we can flatten this out a bit with a generator

/**
 * simple flattening to give scope in a seemingly sync way
 */
function* weatherReport(lat, lon) {
  const points = yield fetchJSON(
    `https://api.weather.gov/points/${lat},${lon}`,
  );
  const forecast = yield fetchJSON(points.properties.forecast);
  const stationsData = yield fetchJSON(points.properties.observationStations);
  const station = stationsData.features[0];
  const obs = yield fetchJSON(`${station.id}/observations/latest`);

  return {
    city: points.properties.relativeLocation.properties.city,
    tonight: forecast.properties.periods[0].detailedForecast,
    stationName: station.properties.name,
    tempC: obs.properties.temperature.value,
  };
}

/**
 * This looks nice, but actually isn't much help by itself.
 * Why not?
 * what do we still need to do?
 */

const reportGen = weatherReport(40.99, -73.78);

reportGen.next().value; // What is this?

// or...

// we define a generator function that looks synchronous and we can write it in a linear way
function* getAndUseReport(lat, lon) {
  const points = yield fetchJSON(
    `https://api.weather.gov/points/${lat},${lon}`,
  );
  const forecast = yield fetchJSON(points.properties.forecast);
  const stationsData = yield fetchJSON(points.properties.observationStations);
  const station = stationsData.features[0];
  const obs = yield fetchJSON(`${station.id}/observations/latest`);

  const report = {
    city: points.properties.relativeLocation.properties.city,
    tonight: forecast.properties.periods[0].detailedForecast,
    stationName: station.properties.name,
    tempC: obs.properties.temperature.value,
  };

  logReport(report);
}

function logReport(report) {
  console.log(report);
}

const reportToRun = weatherReport(40.99, -73.78);

// but we need a separate runner to execute the function body
