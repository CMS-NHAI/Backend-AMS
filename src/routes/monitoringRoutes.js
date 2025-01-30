const express = require('express');
const router = express.Router();
const MonitoringController = require('../controllers/monitoringController');
const LoggingController = require('../controllers/loggingController');
const { Logger } = require('winston');

router.get('/health', MonitoringController.healthCheck);
//* monitoring service
router.post('/monitoring', LoggingController.storeLog);
router.get('/hometab', LoggingController.storeLog)
router.get('/', Logger.EventEmitterAsyncResource)
router.put('/', this.trace.caller)

export default router;