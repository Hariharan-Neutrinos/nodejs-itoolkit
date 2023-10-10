// @ts-check
// Copyright contributors to the nodejs-itoolkit project
// SPDX-License-Identifier: MIT

const { createNewPool } = require('../PoolUtils');

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
        ipc = '*NA',
        ctl = '*here',
        xslib = 'QXMLSERV',
        verbose = process.env.ODBC_LOGS_VERBOSE === 'true',
        connectionPool = null,
    } = config;
    CACHED_POOL = connectionPool;
    const sql = `call ${xslib}.iPLUGR512K(?,?,?)`;

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
        createNewPool(config, queryOptions)
            .then((result) => {
                console.log(`[ODBC_TRANSPORTER] Created a new pool. Caching it.`);
                console.log(`[ODBC_TRANSPORTER] Done.`);
                CACHED_POOL = result;
                query(CACHED_POOL, done, queryOptions);
            })
            .catch((err) => {
                console.log(`[ODBC_TRANSPORTER] Failed to create a new pool.`, err);
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
