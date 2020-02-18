const http = require('http');
const url = require('url');
const jsdom = require('jsdom');

const defaultOptions = {
  defaultHostName  : null,  // set the default host for routes with url without the host mentioned
  allowCrossDomain : true, // if false, crawler filters out links that are not under the `defaultHost` host
};

class LinkCrawler {

  constructor(options = {}) {
    this.setOptions({...defaultOptions, ...options})
  }

  setOptions(options) {this._options = {...this._options ,...options}}
  getOptions() {return {...this._options}}

  getFormattedURL(path) {

    let parsedPath = url.parse(path);

    if (parsedPath.hostname === null || parsedPath.protocol !== 'http' || parsedPath.hash !== null) {
      parsedPath.hostname = parsedPath.hostname || this._options.defaultHostName; // setting default host
      parsedPath.protocol = 'http'; // assuming request to be done using http
      parsedPath.hash = null; // ignoring hash paths
    }

    return parsedPath;
  }
  crawl(link) {

    let linkUrl = url.format(this.getFormattedURL(link)); 
    console.info(`Crawling:: ${linkUrl}`);

    return new Promise((resolve, reject) => {
      http.get(linkUrl, res => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];
      
        let error;
      
        if (statusCode !== 200) 
          error = new Error(`Request Failed. Status Code: ${statusCode}`);
      
        else if (!/^text\/html/.test(contentType)) 
          error = new Error(`Invalid content-type. Expected text/html but received ${contentType}`);
        
        if (error) {
          // Consume response data to free up memory
          res.resume();

          console.warn(`Failed fetching ${linkUrl} :: ${error.message}`);
          resolve([]);

          return;
        }
      
      
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const resultDOM = new jsdom.JSDOM(rawData).window.document;

            let links = [...resultDOM.querySelectorAll('a')].map(x => x.href).map(r => this.getFormattedURL(r));

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

