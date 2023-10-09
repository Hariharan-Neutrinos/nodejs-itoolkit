// Copyright contributors to the nodejs-itoolkit project
// SPDX-License-Identifier: MIT
/**
 * @type {import('odbc')}
 */
let odbc = null;

try {
  /* eslint-disable import/no-unresolved */
  // eslint-disable-next-line global-require
  odbc = require("odbc");
} catch (e) {
  if (e.code !== "MODULE_NOT_FOUND") {
    throw e;
  }
}

function odbcCall(config, xmlInput, done) {
  // odbc transport is not available bail out
  if (odbc === null) {
    done(
      new Error(
        "odbc transport was not found, ensure odbc is installed properly."
      ),
      null
    );
  }

  const {
    host = 'localhost',
    username = null,
    password = null,
    ipc = '*NA',
    ctl = '*here',
    xslib = 'QXMLSERV',
    verbose = process.env.ODBC_LOGS_VERBOSE === 'true',
    dsn = null,
  } = config;

  const sql = `call ${xslib}.iPLUGR512K(?,?,?)`;
  const driver = 'IBM i Access ODBC Driver';
  let connectionString;

  if (dsn && typeof dsn === 'string') {
    connectionString = `DSN=${dsn}`;
  } else {
    connectionString = `DRIVER=${driver};SYSTEM=${host};`;

    if (username && typeof username === 'string') {
      connectionString += `UID=${username};`;
    }
    if (password && typeof password === 'string') {
      connectionString += `PWD=${password};`;
    }
  }

  if (verbose) {
    console.log(`SQL to run is ${sql}`);
  }
  const {
    ODBC_POOL_INITIALSIZE,
    ODBC_POOL_INCREMENTSIZE,
    ODBC_POOL_MAXSIZE,
    ODBC_POOL_REUSECONNECTION,
    ODBC_POOL_SHRINK,
  } = process.env;
  const pool_options = {
    connectionString,
    initialSize: ODBC_POOL_INITIALSIZE && parseInt(ODBC_POOL_INITIALSIZE),
    incrementSize:
      ODBC_POOL_INCREMENTSIZE && parseInt(ODBC_POOL_INCREMENTSIZE),
    maxSize: ODBC_POOL_MAXSIZE && parseInt(ODBC_POOL_MAXSIZE),
    reuseConnection:
      ODBC_POOL_REUSECONNECTION && ODBC_POOL_REUSECONNECTION === "true",
    shrink: ODBC_POOL_SHRINK && ODBC_POOL_SHRINK === "true",
  }
  console.log(`=====effective pool options====`, pool_options);

  odbc.pool(pool_options, (connectError, pool) => {
      if (connectError) {
        done(connectError, null);
        return;
      }
      pool.query(sql, [ipc, ctl, xmlInput], (queryError, results) => {
        if (queryError) {
          done(queryError, null);
          return;
        }
        if (!results) {
          done("Empty result set was returned", null);
          return;
        }
        let xmlOutput = "";
        results.forEach((chunk) => {
          xmlOutput += chunk.OUT151;
        });
        done(null, xmlOutput);
      });
    }
  );
}

exports.odbcCall = odbcCall;
