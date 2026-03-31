const { port }  = require("./config")
const app       = require("./src/app")
const logger    = require("./src/utils/log/logger")
const ws        = require('./src/webSocket')
// require('./src/utils/cron');

const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`)
})

ws(server)

process.on("unhandledRejection", (err) => {
    logger.error("Unhandled rejection", { error: err.message })
    process.exit(1)
})

process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message })
    process.exit(1)
})
