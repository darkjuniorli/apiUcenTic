/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright IBM Corporation 2020
*/

const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require("path");
const cors = require('cors');


function buildConfig(argv) {

  const config = {
    'port': argv.port /*|| port*/,
    'https': {
      'key': argv.key /*|| key*/,
      'cert': argv.cert /*|| cert*/,
      'pfx': argv.pfx,
      'passphrase': argv.pass,
    }
  };
  return config;
}

function loadCertificateFiles(config) {
  // load https certs file content
  if (config && config.https) {
    ['key', 'cert', 'pfx'].forEach(key => {
      if (config.https[key]) {
        let file = config.https[key];
        config.https[key] = fs.readFileSync(file);
      }
    });
  }
  return config;
};

function validateParams (argv) {
  let isValid = true;
  const serviceFor=argv.s;

  if((argv.p==='' || !argv.p) && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] port configuration is missing\n`);
  }

  if( (argv.k==='' && argv.c==='' && argv.x==='' && argv.w==='') && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] https configuration is missing\n`);
  }

  if( ( (argv.k==='' && argv.c>'') || (argv.k>'' && argv.c==='')
      || (argv.x==='' && argv.w>'' && argv.k==='' && argv.c==='')
      || (argv.x==='' && argv.w>'' && !(argv.k>'' && argv.c>'')) 
      || (argv.x>'' && argv.w==='') ) && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] https configuration is missing\n`);
  }

  if(!isValid) {
    process.stderr.write(`[${serviceFor}] is failed to start, error:\n`);
    process.exit(1);
    return false;
  }

  return true;
}

var argv = require('yargs')
  .usage('Usage: $0 [options]')
  .option('s', {
    alias: 'service',
    description: 'service-for path',
    default: ''
  })
  .option('p', {
    alias: 'port',
    description: 'listening port'
  })
  .option('k', {
    alias: 'key',
    default: '',
    description: 'server key'
  })
  .option('c', {
    alias: 'cert',
    default: '',
    description: 'server cert',
  })
  .option('x', {
    alias: 'pfx',
    default: '',
    description: 'server pfx',
  })
  .option('w', {
    alias: 'pass',
    default: '',
    description: 'server pfx passphrase',
  })
  .option('v', {
    alias: 'verbose',
    default: false,
    description: 'show request logs',
    type: 'boolean'
  })
  .help('h')
  .alias('h', 'help')
  .check(validateParams)
  .argv;

let config = buildConfig(argv);
config = loadCertificateFiles(config);
const {https:{key, cert}} = config;
const credentials = { key, cert };

const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
 
var options = {
  explorer: true
};
 
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
//TODO: use for whitelist only
app.use(cors());
const routes = require('./routes/index.route');

app.get('/', (req, res) => res.send('<br><h1>Api TCI UCEN</h1> <h4>Jorge Guevara</h4><h4>Fabrizzio Basso</h4>Uso npm install , luego npm start.<h3>Muestra un listado de los carros y las caracteristicas de cada uno, mediante los siguientes url: </h3>Muestra el listado de los carros:<h4>https://localhost:8081/cars/</h4> Si se coloca un numero adicional al parametro de la url mostrara el numero del carro, ejemplo: <h4>https://localhost:8081/cars/1 </h4>'));
app.get('/health', (req, res) => {
  const healthcheck = {
		uptime: process.uptime(),
		message: 'OK',
		timestamp: Date.now()
  };
  res.send(JSON.stringify(healthcheck));
});
app.use(routes);

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(config.port);
httpsServer.listen(config.port+1);
console.log(`http server listening at port ${config.port}`);
console.log(`https server listening at port ${config.port + 1}`);

module.exports = { app };
