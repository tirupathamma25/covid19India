const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const totalCovidInformation = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => console.log("Server is Running"));
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//API 1
app.get("/states/", async (request, response) => {
  const getStateQuery = `
    SELECT
      *
    FROM
      state
      ORDER BY state_id
      ;`;
  const stateArray = await database.all(getStateQuery);
  const stateResult = stateArray.map((eachState) => {
    return convertStateDbObjectToResponseObject(eachState);
  });
  response.send(stateResult);
});

//API 2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
    state
    WHERE 
      state_id = ${stateId};`;
  const state = await database.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

//API 3
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
  INSERT INTO
   district (district_name,state_id,cases,cured,active,deaths)
  VALUES
    ('${districtName}', '${stateId}', '${cases}', '${cured}', '${active}', '${deaths}');`;
  const newDistrict = await database.run(postDistrictQuery);
  const districtId = newDistrict.lastID;

  response.send("District Successfully Added");
});

//API 4

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
      *
    FROM 
   district
    WHERE 
      district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

//API 6

app.put("/districts/:districtId/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const { districtId } = request.params;
  const updateDistrictQuery = `
            UPDATE
               district
            SET
               district_name = '${districtName}',
               state_id = ${stateId},
               cases = ${cases},
               cured = ${cured},
               active = ${active},
               deaths = ${deaths}
            WHERE
               district_id = ${districtId};`;

  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStats = `
    SELECT
     SUM(cases) AS cases,
     SUM(cured) AS cured,
     SUM(active) AS active,
     SUM(deaths) AS deaths
    FROM
     district
    WHERE
      state_id = ${stateId};`;
  const stats = await database.get(getStateStats);
  const result = totalCovidInformation(stats);
  response.send(result);
});

//API 8
app.get("/districts/:districtId/details", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
    SELECT 
      state_name
    FROM 
   state JOIN district ON state.state_id = district.state_id
    WHERE 
      district.district_id = ${districtId};`;
  const stateName = await database.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});

module.exports = app;
