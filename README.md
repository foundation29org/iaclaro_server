# IAclaro Server

IAclaro is a research project in the development phase that applies artificial intelligence to generate hospital discharge reports adapted to the patient's level of understanding. Its goal is to improve the clarity of medical information, optimize continuity of care, and promote therapeutic adherence.

## 🌟 Key Features

- **Simplified Language:** Converts discharge reports with complex terminology into more accessible and easier-to-understand texts.
- **Dynamic Adaptation:** Adjusts the level of detail of the report according to the patient's health literacy and their demographic and clinical factors.
- **Optimization of Clinical Coding:** Uses natural language processing to code diagnoses and procedures with greater precision and consistency.

## 🚀 Getting Started

### Prerequisites

- Node.js (recommended version: 22.13.1)
- Azure account (for services like OpenAI, Blob Storage, etc.)
- Accounts in various AI services (OpenAI, Anthropic, Google, etc.)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/your-username/nav29-server.git
cd nav29-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Create a `.env` file in the project root based on `.env.example`
   - Fill in all variables with your own credentials

4. Start the server in development mode:
```bash
npm run servedev
```

### Repository Structure

- **Client**: The frontend code is available at [https://github.com/foundation29org/iaclaro_frontend](https://github.com/foundation29org/iaclaro_frontend)
- **Server**: This repository contains the backend code.

## Secure Credential Management

### Important: Credential Security
- The `config.js` file contains references to environment variables for all credentials
- **NEVER** upload real credentials to GitHub
- Make sure `config.js` is included in `.gitignore` if it contains hardcoded credentials
- Use environment variables for all credentials in production environments

### Setting up environment variables in production
For production environments (such as Azure App Service), configure all necessary environment variables in the Configuration/Application settings section.

## 🌐 Supported Languages

- English
- Spanish

## ⚠️ Disclaimer

IAclaro is in the development phase and is part of a multicenter clinical trial. It should not be used in isolation for medical decision-making nor does it replace clinical judgment. Healthcare professionals retain final responsibility for the care and recommendations provided to the patient. This project is designed for research and scientific validation purposes, and the results obtained should be interpreted with caution.

## 📧 Contact

-   Foundation29: support@foundation29.org
-   Clinical context: Hospital Universitario La Paz (Dr. Yale Tung Chen) 
-   Foundation29 Website: [foundation29.org](https://foundation29.org)

Developed with ❤️ by [Foundation 29](https://foundation29.org)

<p>&nbsp;</p>

<div style="border-top: 1px solid !important;
	padding-top: 1% !important;
    padding-right: 1% !important;
    padding-bottom: 0.1% !important;">
	<div align="right">
		<img width="150px" src="https://dxgpt.app/assets/img/logo-foundation-twentynine-footer.png">
	</div>
	<div align="right" style="padding-top: 0.5% !important">
		<p align="right">	
			Copyright © 2024
			<a style="color:#009DA0" href="https://www.foundation29.org/" target="_blank"> Foundation29</a>
		</p>
	</div>
<div>
