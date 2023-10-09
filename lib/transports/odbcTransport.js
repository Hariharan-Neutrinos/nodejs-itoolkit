// @ts-check
// Copyright contributors to the nodejs-itoolkit project
// SPDX-License-Identifier: MIT
/**
 * @type {import('odbc')}
 */
let odbc = null;
/**
 * @type {import('odbc').Pool}
 */
let CACHED_POOL = null;
try {
    /* eslint-disable import/no-unresolved */
    // eslint-disable-next-line global-require
    odbc = require('odbc');
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
    }
}

function odbcCall(config, xmlInput, done) {
    // odbc transport is not available bail out
    if (odbc === null) {
        done(new Error('odbc transport was not found, ensure odbc is installed properly.'), null);
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
    const queryOptions = {
        sql,
        ipc,
        ctl,
        xmlInput,
    };
    if (CACHED_POOL) {
        console.log(`[ODBC_TRANSPORTER] Cached pool exists...`);
        query(CACHED_POOL, done, queryOptions);
    } else {
        console.log(`[ODBC_TRANSPORTER] No pool available ==> creating new pool...`);
        const { ODBC_POOL_INITIALSIZE, ODBC_POOL_INCREMENTSIZE, ODBC_POOL_MAXSIZE, ODBC_POOL_REUSECONNECTION, ODBC_POOL_SHRINK } =
            process.env;
        /**
         * @type {import('odbc').PoolParameters}
         */
        const pool_options = {
            connectionString,
            initialSize: ODBC_POOL_INITIALSIZE && parseInt(ODBC_POOL_INITIALSIZE),
            incrementSize: ODBC_POOL_INCREMENTSIZE && parseInt(ODBC_POOL_INCREMENTSIZE),
            maxSize: ODBC_POOL_MAXSIZE && parseInt(ODBC_POOL_MAXSIZE),
            reuseConnection: ODBC_POOL_REUSECONNECTION && ODBC_POOL_REUSECONNECTION === 'true',
            shrink: ODBC_POOL_SHRINK && ODBC_POOL_SHRINK === 'true',
        };
        console.log(`[ODBC_TRANSPORTER] Effective pool options`, pool_options);
        odbc.pool(pool_options)
            .then((result) => {
                console.log(`[ODBC_TRANSPORTER] Created a new pool. Caching it.`);
                CACHED_POOL = result;
                console.log(`[ODBC_TRANSPORTER] Done.`);
                query(CACHED_POOL, done, queryOptions);
            })
            .catch((err) => {
                console.error(err);
                done(err, null);
            });
    }
}

/**
 *
 * @param {import('odbc').Pool} pool
 * @param {(err: Error | string | null, output: string | null) => any} done
 * @param {Qoptions} qoptions
 */
function query(pool, done, { sql, ipc, ctl, xmlInput }) {
    console.log(`[ODBC_TRANSPORTER] Pool Status`, {
        poolSize: pool.poolSize,
        freeConnections: pool.freeConnections.length,
        waitingConnectionWork: pool.waitingConnectionWork,
        connectionsBeingCreatedCount: pool.connectionsBeingCreatedCount,
    });
    pool.query(sql, [ipc, ctl, xmlInput], (queryError, results) => {
        if (queryError) {
            done(queryError, null);
            return;
        }
        if (!results) {
            done('Empty result set was returned', null);
            return;
        }
        let xmlOutput = '';
        results.forEach((chunk) => {
            xmlOutput += chunk.OUT151;
        });
        done(null, xmlOutput);
    });
}

/**
 * @typedef {{
 * sql: string,
 * ipc: any,
 * ctl: any,
 * xmlInput: string
 * }} Qoptions
 */

exports.odbcCall = odbcCall;
