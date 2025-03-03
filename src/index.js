import express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'
import centralizedRoutes from './routes/index.js'
import { sendMessage } from './kafka/kafkaProducer.js'
import { STATUS_CODES } from './constants/statusCodeConstants.js'
import { APP_CONSTANTS } from './constants/appConstants.js'

// import ArticleRouter from "./routes/ArticleRoute.js";
// import UserRouter from "./routes/userRoute.js";
// const eurekaClient = require('./config/eurekaClient.js');
// const esClient = require('./config/elasticsearch.js');

const app = express()

app.use(helmet())
app.use(express.urlencoded({ extended: true }))
app.use(compression())
app.use(cors())
app.use(express.json())

app.use("/backend/ams/api/v1", centralizedRoutes);

const PORT = process.env.PORT || 3001
// const server = http.createServer(app);

app.get('/backend', (req, res) => {
  res.status(STATUS_CODES.OK).send({
    message: `Welcome to AMS-Service Datalake 3.0 ${APP_CONSTANTS.APP_NAME} v${APP_CONSTANTS.VERSION}`,
  });
});

app.listen(PORT, () => {
  console.log(`server started on PORT ${PORT}`)
})