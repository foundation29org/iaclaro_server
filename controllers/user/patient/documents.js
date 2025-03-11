'use strict'

const bookService = require("../../../services/books")
const insights = require('../../../services/insights')
const f29azureService = require("../../../services/f29azure")
const path = require('path');
const translationService = require("../../../services/translation")

// Add this helper function after the existing imports
function capitalizeWords(str) {
	return str.replace(/\b\w/g, letter => letter.toUpperCase());
}

async function extractEventsFromFile(req, res) {
	try {
	  // Sube doc al blob de Azure
	  if (req.files == null) {
		return res.status(400).json({ message: `Error: no files` });
	  }
	  let containerName = 'data';
	  var savedOk = await saveBlob(containerName, req.body.url, req.files.thumbnail);
	  if (!savedOk) {
		return res.status(500).json({ message: 'Error saving file to blob storage' });
	  }
		
	const filename = path.basename(req.body.url);

	let isTextFile = false;
	console.log("reqfiles:", req.files);
    if (req.files.thumbnail.mimetype == 'text/plain') {
        isTextFile = true;
    }

	let formResult = null;

	if (!isTextFile) {
		// Llamada a Form Recognizer
		formResult = await bookService.form_recognizer(
		req.body.userId,
		req.body.docId,
		containerName,
		req.body.url
	);
	} else {
		// get the text from the text/plain from the req body url sin llamar a form recognizer
		formResult = {
			data: req.files.thumbnail.data.toString('utf8'),
			doc_id: req.body.docId
		};
		console.log("SYS: reqbodyurl:", req.body.url);
		console.log("SYS: formResult:", formResult);
	}
		
	// Detectar idioma
	 let detectedLanguage = await translationService.getDetectLanguage(formResult.data);
	 if (!detectedLanguage) detectedLanguage = 'en';

	// let detectedLanguage = 'en';
  
	// Extraer events
	let events = await bookService.extractEvents(formResult.data, detectedLanguage);

	// Traducir conditions y treatments al inglés, si deseas:
	if (detectedLanguage !== 'en' && events) {
	console.log("SYS: translating conditions and treatments to english...");
			for (const field of ['conditions', 'treatments']) {
			if (events[field]?.length > 0) {
				const itemsToTranslate = events[field].map(item => ({ Text: item }));
				const translatedItems = await translationService.getTranslationDictionary2(itemsToTranslate, detectedLanguage);
				events[field] = translatedItems.map(item => item.translations[0].text);
			}
		}
	}

	// Ahora *solo* devolvemos los events, sin llamar a getClinicalTrials
	return res.status(200).json({
		events,
		language: detectedLanguage
		});
  
	} catch (error) {
	  console.error("Unexpected error in extractEventsFromFile:", error);
	  insights.error(error);
	  return res.status(500).json({ message: "Unexpected error occurred", error: error.message });
	}
  }

  async function searchTrials(req, res) {
	try {
	  const { events, language } = req.body;
	  
	  if (!events) {
		return res.status(400).json({ message: "No events to search" });
	  }
	  
	  // Verificar si tenemos al menos un criterio de búsqueda
	  const hasSearchCriteria = ['conditions', 'treatments', 'otherTerms'].some(
		field => Array.isArray(events[field]) && events[field].length > 0
	  );
	  
	  if (!hasSearchCriteria) {
		return res.status(400).json({ message: "No search criteria provided" });
	  }
	  
	  // Llamar a getClinicalTrials
	  const clinicalTrials = await bookService.getClinicalTrials(events, language || 'en');
	  
	  // Devolver trials
	  return res.status(200).json({
		clinicalTrials
	  });
	} catch (error) {
	  console.error("Error in searchTrials:", error);
	  return res.status(500).json({
		message: "Error retrieving trials",
		error: error.message
	  });
	}
  }

  
async function getTrialMatchesFromFile(req, res) {
	try {
		// Guarda doc en el blob de Azure
		let containerName = 'data';
		if (req.files != null) {
			var data1 = await saveBlob('data', req.body.url, req.files.thumbnail);
			if (!data1) {
				return res.status(500).json({ message: 'Error saving file to blob storage' });
			}
			const filename = path.basename(req.body.url);

			console.log("SYS: function getTrialMatchesFromFile has been called on a <", filename, ">");
			console.log("SYS: content of the document has been saved in the blob");

			console.log("==> <form_recognizer>");

			var formResult = await bookService.form_recognizer(req.body.userId, req.body.docId, containerName, req.body.url);

			console.log("<getTrialMatchesFromFile> <==");
			console.log("SYS: formResult:", formResult);

			console.log("==> <getDetectLanguage>");
			let detectedLanguage = await translationService.getDetectLanguage(formResult.data);
			if (detectedLanguage == null) {
				detectedLanguage = 'en'
			}
            console.log("SYS: detected language:", detectedLanguage);
			console.log("<getTrialMatchesFromFile> <==");

			console.log("==> <extractEvents>");
			let events = await bookService.extractEvents(formResult.data, detectedLanguage);


			// let detectedLanguage = 'es';
			// console.log("SYS: detected language:", detectedLanguage);

			// let events = {
			// 	conditions: [ 'problemas de corazón' ],// [ 'Malaltia de Wilson', 'distrofia de cons' ],
			// 	otherTerms: [
			// 	//   'CRB1',
			// 	//   'ABCA4',
			// 	//   'heterozigosi',
			// 	//   'patosgènica',
			// 	//   'probablement patosgènica',
			// 	//   'VUS',
			// 	//   'HGVS',
			// 	//   'ACMG',
			// 	//   'OMIM',
			// 	//   'Human Gene Mutation Database (HGMD)',
			// 	//   'GeneTest.org',
			// 	//   'Online Mendelian Inheritance in Man (OMIM)',
			// 	//   'SIFT',
			// 	//   'PolyPhen2',
			// 	//   'MutationTaster',
			// 	//   'CNVs',
			// 	//   'exomeDepth',
			// 	//   'FastQC',
			// 	//   'cutadapt',
			// 	//   'BWA',
			// 	//   'BEDtools',
			// 	//   'Picard',
			// 	//   'SAMtools',
			// 	//   'GATK',
			// 	//   'FreeBayes',
			// 	//   'VarScan',
			// 	//   'SnpEff',
			// 	//   '1000 Genomes',
			// 	//   'dbSnp',
			// 	//   'ExAc',
			// 	//   'clinvar'
			// 	],
			// 	treatments: [
			// 	//   'monitorització tractament',
			// 	//   'Seqüenciació de 6713 gens',
			// 	//   'validació per Sanger',
			// 	//   'analisi de progenitors',
			// 	//   'assessorament genètic'
			// 	],
			// 	locations: [
			// 	//   'Sant Joan de Déu Barcelona · Hospital',
			// 	//   'Esplugues',
			// 	//   'Servei de Medicina Genetica i Molecular Hospital Sant Joan de Déu',
			// 	//   'Pg. Sant Joan de Déu 2, planta 0 08950 .- Esplugues (Barcelona)'
			// 	]
			//   }
			  console.log("SYS: events:", events);

			// After events are defined, capitalize all treatment words
			if (events.treatments) {
				events.treatments = events.treatments.map(treatment => capitalizeWords(treatment));
			}

			// Translate conditions and treatments to English if needed
			if (detectedLanguage !== 'en' && events) {
				console.log("SYS: translating conditions and treatments to english...");
				for (const field of ['conditions', 'treatments']) {
				if (events[field]?.length > 0) {
					const itemsToTranslate = events[field].map(item => ({ Text: item }));
					const translatedItems = await translationService.getTranslationDictionary2(itemsToTranslate, detectedLanguage);
					events[field] = translatedItems.map(item => item.translations[0].text);
				}
				}
				
				// Make sure treatments are capitalized after translation
				if (events.treatments?.length > 0) {
					events.treatments = events.treatments.map(treatment => capitalizeWords(treatment));
				}
			} else {
				console.log("SYS: no need to translate conditions and treatments to english");
			}

			// ClinicalTrials.gov API Search

			let clinicalTrials = [];
			try {
				clinicalTrials = await bookService.getClinicalTrials(events, detectedLanguage);
				
				// Capitalize treatments in clinical trials results
				if (clinicalTrials && Array.isArray(clinicalTrials)) {
					clinicalTrials = clinicalTrials.map(trial => {
						if (trial.treatments && Array.isArray(trial.treatments)) {
							trial.treatments = trial.treatments.map(treatment => capitalizeWords(treatment));
						}
						return trial;
					});
				}
				
				console.log("SYS: clinical trials:", clinicalTrials);
				return res.status(200).json({ 
					events, 
					clinicalTrials, 
					language: detectedLanguage 
				});
			} catch (error) {
				console.error("Error retrieving or translating clinical trials:", error);
				return res.status(500).json({ message: "Error retrieving or translating clinical trials", error: error.message });
			}
	  
			
		} else {
			insights.error('Error: no files');
			return res.status(400).json({ message: `Error: no files` });
		}
	} catch (error) {
		console.error("Unexpected error in getTrialMatchesFromFile:", error);
		insights.error(error);
		return res.status(500).json({ message: "Unexpected error occurred", error: error.message });
	}
}

async function getInclusionExclusionFromCriteria(req, res) {
	try {
	  // Obtenemos text y language del body
	  const { text, language } = req.body;
  
	  if (!text || text.trim().length === 0) {
		return res.status(400).json({ error: "No text to parse or text is empty." });
	  }
  
	  // Si no te pasan 'language', podrías:
	  // 1) Detectar el idioma (p.ej. con tu translationService.getDetectLanguage)
	  // 2) Por simplicidad, asumir "en" si no lo mandan:
	  const detectedLang = language || 'en';
  
	  // Llamada a tu helper en books.js:
	  const structured = await bookService.extractInclusionExclusion(text, detectedLang);
	  
	  // structured = { inclusion: [...], exclusion: [...] }
  
	  return res.status(200).json(structured);
  
	} catch (error) {
	  console.error("Error in getInclusionExclusionFromCriteria:", error);
	  insights.error(error); // si tienes integraciones
	  res.status(500).json({ error: error.message });
	}
  }

async function saveBlob(containerName, url, thumbnail) {
	return new Promise(async function (resolve, reject) {
		// Save file to Blob
		var result = await f29azureService.createBlob(containerName, url, thumbnail.data);
		if (result) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
}

module.exports = {
	getTrialMatchesFromFile,
	getInclusionExclusionFromCriteria,
		extractEventsFromFile,
		searchTrials,
}
