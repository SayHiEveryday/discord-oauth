import util from 'util'
import mysql from 'mysql'
import log4js from "log4js";
import { host , user , password , port , database } from "../constant.json"

const logger = log4js.getLogger();



const pool = mysql.createPool({
    host: host,
    user: user, 
    password: password,
    port: port,
    database: database
})



pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
        logger.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
        logger.error('Database connection was refused.')
        }
    }

    if (connection) connection.release()

    return
});
// @ts-ignore
pool.query = util.promisify(pool.query);

export default pool;