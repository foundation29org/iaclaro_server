// file that contains the routes of the api
'use strict' // ayuda evitar errores de sintaxis

const express = require('express')

const langCtrl = require('../controllers/all/lang')

const translationCtrl = require('../services/translation')
const bookServiceCtrl2 = require('../services/books')
const docsCtrl = require('../controllers/user/patient/documents')
const cors = require('cors');
const serviceEmail = require('../services/email')

//

const api = express.Router()
const config= require('../config')
const myApiKey = config.Server_Key;
// Lista de dominios permitidos
const whitelist = config.allowedOrigins;

// tab to impreove readibility
  // Middleware personalizado para CORS
  function corsWithOptions(req, res, next) {
    const corsOptions = {
      origin: function (origin, callback) {
        // Registramos el origen de la petición para debugging
        console.log('Origin of request:', origin);
        if (whitelist.includes(origin)) {
          callback(null, true);
        } else {
            // La IP del cliente
            // Si no está permitido, capturamos info de la petición
            const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const requestInfo = {
                method: req.method,
                url: req.url,
                headers: req.headers,
                origin: origin,
                body: req.body, // Asegúrate de que el middleware para parsear el cuerpo ya haya sido usado
                ip: clientIp,
                params: req.params,
                query: req.query,
              };
            serviceEmail.sendMailControlCall(requestInfo)
            callback(new Error('Not allowed by CORS'));
        }
      },
    };
  
    cors(corsOptions)(req, res, next); // devuelve otro middleware
    // se llama inmediatamente para ejecutarlo
  }

  const checkApiKey = (req, res, next) => {
    // Verifica que exista API Key válida en el encabezado x-api-key
    // Permitir explícitamente solicitudes de tipo OPTIONS para el "preflight" de CORS
    if (req.method === 'OPTIONS') {
      return next();
    } else {
      const apiKey = req.get('x-api-key');
      if (apiKey && apiKey === myApiKey) {
        return next();
      } else {
        return res.status(401).json({ error: 'API Key no válida o ausente' });
      }
    }
  };

// lang routes, using the controller lang, this controller has methods
api.get('/langs/',  langCtrl.getLangs)
// documentsCtrl routes, using the controller documents, this controller has methods
api.post('/callTrialMatcher', corsWithOptions, checkApiKey, docsCtrl.getTrialMatchesFromFile) // upload file to azure blob
api.post("/trialEligibility", corsWithOptions, checkApiKey, docsCtrl.getInclusionExclusionFromCriteria); // structure for criteria
// 2-part checkbox search test ############
api.post('/extractEventsFromFile', corsWithOptions, checkApiKey, docsCtrl.extractEventsFromFile); // extract events from file
api.post('/searchTrials', corsWithOptions, checkApiKey, docsCtrl.searchTrials); // search trials

  api.post('/callnavigator', corsWithOptions, checkApiKey, bookServiceCtrl2.callNavigator)
  api.post('/callsummary', corsWithOptions, checkApiKey, bookServiceCtrl2.callSummary)
  // resumen de informaciones genéticas
  
  api.post('/translateToEnglish', corsWithOptions, checkApiKey, translationCtrl.translateToEnglish)
  

//translations
api.post('/getDetectLanguage', corsWithOptions, checkApiKey, translationCtrl.getDetectLanguage)
api.post('/translation', corsWithOptions, checkApiKey, translationCtrl.getTranslationDictionary)
api.post('/translationinvert', corsWithOptions, checkApiKey, translationCtrl.getTranslationDictionaryInvert)
api.post('/translationinvertarray', corsWithOptions, checkApiKey, translationCtrl.getTranslationDictionaryInvert2)
api.post('/deepltranslationinvert', corsWithOptions, checkApiKey, translationCtrl.getdeeplTranslationDictionaryInvert)
api.post('/translation/segments', corsWithOptions, checkApiKey, translationCtrl.getTranslationSegments)
api.post('/translation/ia', corsWithOptions, checkApiKey, translationCtrl.getTranslationIA)

//ruta privada
api.get('/private', (req, res) => {
	res.status(200).send({ message: 'You have access' })
})

module.exports = api
