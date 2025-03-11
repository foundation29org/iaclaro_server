'use strict'
const config = require('./../config')
const axios = require('axios');
const langchain = require('../services/langchain')
const f29azureService = require("../services/f29azure")
const countTokens = require( '@anthropic-ai/tokenizer'); 
const {
	SearchClient,
	SearchIndexClient,
	AzureKeyCredential,
	odata,
  } = require("@azure/search-documents");  
const sas = config.BLOB.SAS;
const accountname = config.BLOB.NAMEBLOB;
const form_recognizer_key = config.FORM_RECOGNIZER_KEY
const form_recognizer_endpoint = config.FORM_RECOGNIZER_ENDPOINT



async function callNavigator(req, res) {
	var result = await langchain.navigator_chat(req.body.userId, req.body.question, req.body.conversation, req.body.context);
	res.status(200).send(result);
}

async function callSummary(req, res) {
	let prompt = '';
	if (req.body.role == 'child') {
		prompt = `Please create a simple and engaging explanation of the patient's genetic information, tailored for a young child.
		Use clear, age-appropriate language to explain the patient's genetic situation, focusing on the most important aspects in a way that a child can understand.
		The explanation should be informative and reassuring, helping a young patient feel more comfortable with their genetic information.
		Begin with a basic explanation of what genetic information is and why it's important (Always start with: "The information about your genes that you just shared is called a [document type] and it helps us understand [purpose]"),
		followed by a friendly introduction of the patient, a simplified breakdown of the most important genetic information,
		and any other relevant information in an easy-to-understand "Other" category.
		Ensure that the explanation is informative and neutral, avoiding definitive conclusions or assurances about the absence or presence of health issues based solely on genetic information.
		If there are no pathogenic variants, explain that this does not rule out the possibility of a genetic condition.

		Aditionally you will provide an JSON output with some boolean values and categorizations to modify the explanation if needed.
		
		In the JSON:
		Returns the type of genetic technique used: <WGS, Exome, Panel>.
		Returns the presence of pathogenic variants: <true, false>.
		Returns what is the genetic heritage: <autosomal dominant, autosomal recessive, X-linked dominant, X-linked recessive, Y-linked inheritance>.
		Returns if we need a confirmation with paternal tests: <true, false>.`;
	} else if (req.body.role == 'adolescent') {
		prompt = `Please generate a clear and relatable explanation of the patient's genetic information, suitable for an adolescent audience.
		The explanation should include key information about genetic variants, their potential implications, and any associated conditions, presented in a way that is accessible and engaging for a teenager.
		Aim to empower the patient with knowledge about their genetic situation while being sensitive to the unique concerns and perspectives of adolescents.
		Start with a brief overview of the document type and its purpose (Always start with: "The genetic information you just uploaded is a [document type] and it helps us understand [purpose]"),
		followed by an introduction of the patient, a well-organized presentation of the most relevant genetic data,
		and include any important additional information in the "Other" category.
		Ensure that the explanation is informative and neutral, avoiding definitive conclusions or assurances about the absence or presence of health issues based solely on genetic information.
		If there are no pathogenic variants, explain that this does not rule out the possibility of a genetic condition.

		Aditionally you will provide an JSON output with some boolean values and categorizations to modify the explanation if needed.
		
		In the JSON:
		Returns the type of genetic technique used: <WGS, Exome, Panel>.
		Returns the presence of pathogenic variants: <true, false>.
		Returns what is the genetic heritage: <autosomal dominant, autosomal recessive, X-linked dominant, X-linked recessive, Y-linked inheritance>.
		Returns if we need a confirmation with paternal tests: <true, false>.`;
	} else if (req.body.role == 'adult') {
		prompt = `Please generate a clear and concise explanation of the patient's genetic information, suitable for an adult audience.
		The explanation should include essential information about genetic variants, their potential implications, and any associated conditions, presented in a way that is easy to understand for a non-expert.
		Aim to empower the patient with knowledge about their genetic situation to facilitate informed discussions with healthcare providers.
		Start with a brief overview of the document type and its purpose (Always start with: "The genetic information you just uploaded is a [document type] and it helps to explain [purpose]"),
		followed by an introduction of the patient, a well-organized presentation of genetic data in categories like important variants, their potential effects, associated conditions, etc.,
		and include any relevant additional information in the "Other" category.
		Ensure that the explanation is informative and neutral, avoiding definitive conclusions or assurances about the absence or presence of health issues based solely on genetic information.
		If there are no pathogenic variants, explain that this does not rule out the possibility of a genetic condition.

		Aditionally you will provide an JSON output with some boolean values and categorizations to modify the explanation if needed.
		
		In the JSON:
		Returns the type of genetic technique used: <WGS, Exome, Panel>.
		Returns the presence of pathogenic variants: <true, false>.
		Returns what is the genetic heritage: <autosomal dominant, autosomal recessive, X-linked dominant, X-linked recessive, Y-linked inheritance>.
		Returns if we need a confirmation with paternal tests: <true, false>.
		`;
		}

	let prompt2 = `Please create a JSON timeline from the patient's genetic information and individual events, with keys for 'date', 'eventType', and 'keyGeneticEvent'.
	Extract main genetic events from the documents and individual events, and add them to the timeline. EventType could only be 'diagnosis', 'treatment', 'test'.
	The timeline should be structured as a list of events, with each individual event containing a date, type, and a small description of the event.`;

	// var result = await langchain.navigator_summarize(req.body.userId, promt, req.body.conversation, req.body.context);

	// Executes twice
	// First: extracts summary (prompt)
	// Second: extract timeline (prompt2)
	let promises = [
		langchain.navigator_summarize(req.body.userId, prompt, req.body.context, false, true),
		langchain.navigator_summarize(req.body.userId, prompt2, req.body.context, true, false)
	];
	
	// Utilizar Promise.all para esperar a que todas las promesas se resuelvan
	let [result, result2] = await Promise.all(promises);

	console.log("Resultado 1");
	console.log(result);
	console.log("Resultado 2");
	console.log(result2);

	if(result.text){
		let data = {
			nameFiles: req.body.nameFiles,
			promt: prompt,
			role: req.body.role,
			conversation: req.body.conversation,
			context: req.body.context,
			result: result.text
		}
		let nameurl = req.body.paramForm+'/summary.json';
		f29azureService.createBlobSimple('data', nameurl, data);
	}

	if(result2.text){
		let data = {
			nameFiles: req.body.nameFiles,
			promt: prompt2,
			role: req.body.role,
			conversation: req.body.conversation,
			context: req.body.context,
			result: result2.text
		}
		let nameurl = req.body.paramForm+'/timeline.json';
		f29azureService.createBlobSimple('data', nameurl, data);
	}

	let finalResult = {
		"msg": "done", 
		"result1": result.text,
		"result2": result2.text,
		"status": 200
		}

	res.status(200).send(finalResult);
	}


async function azureFuncSummary(req, prompt, timeline, gene){
    return new Promise(async function (resolve, reject) {
        const functionUrl = config.AF29URL + `/api/HttpTriggerSummarizer?code=${config.functionKey}`;
        axios.post(functionUrl, req.body.context, {
            params: {
                prompt: prompt,
                userId: req.body.userId,
				timeline: timeline,
				gene: gene
            },
            headers: {
                'Content-Type': 'application/json'
            },
        }).then(async response => {
            resolve(response);
        }).catch(error => {
          console.error("Error:", error);
          reject(error);
        });
    });
}

async function form_recognizer(userId, documentId, containerName, url) {
	// Toma un archivo almacenado en Azure Blob Storage y lo envía a Form Recognizer para extraer el texto

	return new Promise(async function (resolve, reject) {
		var url2 = "https://" + accountname + ".blob.core.windows.net/" + containerName + "/" + url + sas; // URL del archivo en Azure Blob Storage para acceder a él
		const modelId = "prebuilt-layout"; // replace with your model id
		const endpoint = form_recognizer_endpoint; // replace with your endpoint
		const apiVersion = "2023-10-31-preview";
		const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${modelId}:analyze?_overload=analyzeDocument&api-version=${apiVersion}&outputContentFormat=markdown`;

		const headers = {
			'Ocp-Apim-Subscription-Key': form_recognizer_key
		  };
		  
		  const body = {
			urlSource: url2
		  };
		  
		  axios.post(analyzeUrl, body, { headers: headers })
		  .then(async response => {
			
			const operationLocation = response.headers['operation-location'];
			let resultResponse;
			do {
			  resultResponse = await axios.get(operationLocation, { headers: headers });
			  if (resultResponse.data.status !== 'running') {
				break;
			  }
			  await new Promise(resolve => setTimeout(resolve, 1000));
			} while (true);
			
			// console.log(resultResponse);
			// console.log(resultResponse.data.error.details);
			let content = resultResponse.data.analyzeResult.content;

			//const category_summary = await langchain.categorize_docs(userId, content);
	
			var response = {
			"msg": "done", 
			"data": content,
			"summary": content,
			"doc_id": documentId, 
			"status": 200
			}

			const tokens = countTokens.countTokens(response.data);
			response.tokens = tokens;
			resolve(response);
		})
		.catch(error => {
		  console.error("Error in analyzing document:", error);
		  reject(error);
		});
	  }
	);
  }

/**
 * Extract key events (conditions, diseases, treatments, locations, ...) from the recognized file content
 * @param {string} documentText - the text extracted by 'form_recognizer' at document.js
 * @param {string} detectedLanguage - lang (eg., "en", "es") 
 * @returns {Promise<Object>} - array with the events
 */
async function extractEvents(documentText, detectedLanguage) {
  try {
	console.log("SYS: detectedLanguage:", detectedLanguage);
    return await langchain.extract_report_events( // resolves the promise
      'system', // Default system userId
      documentText,
      detectedLanguage
    );
  } catch (error) {
    throw error; // reject the promise
  }
}

/**
 * Extrae los criterios de inclusión y exclusión usando LLM
 * @param {string} criteriaText - Texto completo con "eligibility criteria" o "participation criteria".
 * @param {string} detectedLanguage - Idioma detectado (ej: 'en', 'es') 
 * @returns {Promise<Object>} 
 *   {
 *     inclusion: [],
 *     exclusion: []
 *   }
 */
async function extractInclusionExclusion(criteriaText, detectedLanguage) {
	try {
	  return await langchain.extract_inclusion_exclusion_criteria(
		'system', // userId por defecto o lo que prefieras
		criteriaText,
		detectedLanguage
	  );
	} catch (error) {
	  throw error;
	}
  }


/**
 * Constructs a ClinicalTrials.gov API request URL based on the provided events.
 *
 * The mapping from event keys to API query parameters is as follows:
 *   - conditions  -> query.cond
 *   - otherTerms  -> query.term
 *   - treatments  -> query.intr
 *   - locations   -> query.locn
 *
 * @param {Object} events - Object containing arrays of search terms.
 * @param {string[]} events.conditions - Array of medical conditions.
 * @param {string[]} events.otherTerms - Array of additional medical terms.
 * @param {string[]} events.treatments - Array of treatments/interventions.
 * @param {string[]} events.locations - Array of trial locations.
 * @returns {string} - The full API request URL.
 */
function buildClinicalTrialsURL(events, pageSize) {
	const baseUrl = "https://clinicaltrials.gov/api/v2/studies";
  
	// Usar URLSearchParams para manejar la codificación de parámetros URL
	const params = new URLSearchParams();
  
	// Priorizar condiciones - si hay condiciones, usamos solo esas para la búsqueda
	if (Array.isArray(events.conditions) && events.conditions.length > 0) {
	  // Unir múltiples valores con " OR " (según el formato esperado por la API)
	  const value = events.conditions.join(" OR ");
	  params.append("query.cond", value);
	  
	  // Si solo hay condiciones, no agregamos otros términos o tratamientos
	  // Esto mejora la precisión de los resultados
	  return `${baseUrl}?${params.toString()}`;
	}
  
	// Si no hay condiciones, seguimos con el comportamiento original
	const searchCriteria = [
	  { field: "conditions", param: "query.cond" },
	  { field: "otherTerms", param: "query.term" },
	  { field: "treatments", param: "query.intr" },
	];

	// Para cada criterio de búsqueda, si el objeto events tiene valores, añadirlos como parámetros.
	searchCriteria.forEach(({ field, param }) => {
	  if (Array.isArray(events[field]) && events[field].length > 0) {
		const value = events[field].join(" OR ");
		params.append(param, value);
	  }
	});
  
	// Añadir el parámetro pageSize a la URL para controlar el número de resultados
	if (pageSize) {
		params.append("pageSize", pageSize);
	}
  
	// Construir y devolver la URL final
	return `${baseUrl}?${params.toString()}`;
  }

/**
 * Obtiene y procesa ensayos clínicos de ClinicalTrials.gov basándose en "events".
 *
 * @param {Object} events - Objeto con arrays de búsqueda.
 * @param {string} language - Código del idioma para traducir los resultados (ej. 'en' o 'es').
 * @returns {Promise<Array<Object>>} - Array de ensayos clínicos traducidos.
 */
async function getClinicalTrials(events, language) {
	if (!language) throw new Error("El parámetro 'language' es obligatorio.");
	if (!events || !Object.values(events).some(arr => Array.isArray(arr) && arr.length > 0)) {
	  console.log("No se proporcionaron parámetros de búsqueda.");
	  return [];
	}

	const pageSize = 20;
  
	// Construir la URL base para la consulta
	let requestUrl = buildClinicalTrialsURL(events, pageSize);
	
	// https://clinicaltrials.gov/api/v2/studies?query.cond=Malaltia+de+Wilson+OR+distrofia+de+cons&query.term=CRB1+OR+ABCA4+OR+heterozigosi+OR+patosg%C3%A8nica+OR+probablement+patosg%C3%A8nica+OR+VUS+OR+HGVS+OR+ACMG+OR+OMIM+OR+Human+Gene+Mutation+Database+%28HGMD%29+OR+GeneTest.org+OR+Online+Mendelian+Inheritance+in+Man+%28OMIM%29+OR+SIFT+OR+PolyPhen2+OR+MutationTaster+OR+CNVs+OR+exomeDepth+OR+FastQC+OR+cutadapt+OR+BWA+OR+BEDtools+OR+Picard+OR+SAMtools+OR+GATK+OR+FreeBayes+OR+VarScan+OR+SnpEff+OR+1000+Genomes+OR+dbSnp+OR+ExAc+OR+clinvar&query.intr=monitoritzaci%C3%B3+tractament+OR+Seq%C3%BCenciaci%C3%B3+de+6713+gens+OR+validaci%C3%B3+per+Sanger+OR+analisi+de+progenitors+OR+assessorament+gen%C3%A8tic&query.locn=Sant+Joan+de+D%C3%A9u+Barcelona+%C2%B7+Hospital+OR+Esplugues+OR+Servei+de+Medicina+Genetica+i+Molecular+Hospital+Sant+Joan+de+D%C3%A9u+OR+Pg.+Sant+Joan+de+D%C3%A9u+2%2C+planta+0+08950+.-+Esplugues+%28Barcelona%29
	console.log("SYS: requestUrl:", requestUrl);
  
	try {
	  const response = await axios.get(requestUrl);
	  const studies = response?.data?.studies || []; // from seeing the devtools
  
	  // Mapeo sencillo de los estudios para extraer algunos campos
	  const trials = studies.map(study => {
		const ps = study.protocolSection || {};
		// console.log("SYS: ps:", JSON.stringify(ps, null, 2)); //// visualizar "res"
		if (ps.contactsLocationsModule?.locations?.length > 0) {
			// PRINT THE LOCATIONS object to string
			console.log("SYS: ps.contactsLocationsModule.locations:", JSON.stringify(ps.contactsLocationsModule.locations, null, 2));
		}

		return {
		  NCTId: ps.identificationModule?.nctId || "",
		  BriefTitle: ps.identificationModule?.briefTitle || "",
		  Organization: ps.identificationModule?.organization?.fullName || "",
		  LocationFacility: ps.contactsLocationsModule?.locations?.[0]?.facility || "",
		  OverallStatus: ps.statusModule?.overallStatus || "",
		  BriefSummary: ps.descriptionModule?.briefSummary || "",
		  Condition: ps.conditionsModule?.conditions?.[0] || "",
		  InterventionName: ps.armsInterventionsModule?.interventions?.[0]?.name || "",
		  Locations: ps.contactsLocationsModule?.locations || [],
		  ParticipationCriteria: ps.eligibilityModule?.eligibilityCriteria || "",
		  StudyLink: `https://clinicaltrials.gov/study/${ps.identificationModule?.nctId || ""}`
		};
	  });

	  return trials;

	  // return await translateClinicalTrials(trials, language); // todo
  
	} catch (error) {
	  console.error("Error al obtener los ensayos clínicos:", error);
	  throw new Error(`Error en la petición: ${error.message}. URL: ${requestUrl}`);
	}
  }

async function translateClinicalTrials(trials, language) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!trials || trials.length === 0 || !language) {
        resolve(trials);
        return;
      }

      const translatedTrials = await Promise.all(trials.map(async (trial) => {
        const translatedTrial = { ...trial };
        const fieldsToTranslate = ['BriefTitle', 'Condition', 'InterventionName'];

        for (const field of fieldsToTranslate) {
          if (trial[field]) {
            const translation = await langchain.translateSummary(language, trial[field]);
            translatedTrial[field] = translation.text;
          }
        }
        return translatedTrial;
      }));

      resolve(translatedTrials);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
	callNavigator,
	callSummary,
	form_recognizer,
  extractEvents,
  getClinicalTrials,
  extractInclusionExclusion
};



