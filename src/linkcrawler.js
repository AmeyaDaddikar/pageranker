const http = require('http');
const url = require('url');
const jsdom = require('jsdom');

const LinkCrawler = {
  _options: {
    defaultHostName  : null,  // set the default host for routes with url without the host mentioned
    allowCrossDomain : true, // if false, crawler filters out links that are not under the `defaultHost` host
  },
  setOptions(options) {this._options = {...this._options ,...options}},

  crawl(link) {
    return new Promise((resolve, reject) => {
      http.get(link, res => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];
      
        let error;
      
        if (statusCode !== 200) 
          error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
      
        else if (!/^text\/html/.test(contentType)) 
          error = new Error(`Invalid content-type.\nExpected text/html but received ${contentType}`);
        
        if (error) {
          // Consume response data to free up memory
          res.resume();
          reject(error);
          return;
        }
      
      
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const resultDOM = new jsdom.JSDOM(rawData).window.document;
            let links = [...resultDOM.querySelectorAll('a')].map(x => x.href).map(l => url.parse(l));

            links.forEach(link => {
              // set default host for links without host
              if (link.hostname === null) {
                link.hostname = this._options.defaultHostName;
              }
            });

            if (!this._options.allowCrossDomain)
              links = links.filter(l => l.hostname === this._options.defaultHostName)

            resolve(links);

          } catch (e) {
            reject(e.message);
          }
        });
      })
      .on('error', reject);
    });
  }
};

module.exports = LinkCrawler;

