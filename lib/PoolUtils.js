const createNewPool = (config) => {
    const odbc = require('odbc');

    const { host = 'localhost', username = null, password = null, dsn = null } = config;

    let connectionString;
    const driver = 'IBM i Access ODBC Driver';
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
    console.log(`[ODBC_TRANSPORTER] No pool available ==> creating new pool...`);
    const {
        ODBC_POOL_INITIALSIZE,
        ODBC_POOL_INCREMENTSIZE,
        ODBC_POOL_MAXSIZE,
        ODBC_POOL_REUSECONNECTION,
        ODBC_POOL_SHRINK,
    } = process.env;
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
    return odbc.pool(pool_options);
};

module.exports = {
    createNewPool,
};
