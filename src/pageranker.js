const url  = require('url');
const fs   = require('fs');

const Mutex  = require('async-mutex').Mutex;
const uuidv1 = require('uuid/v1');
const events = require('events');

const LinkCrawler = require('./linkcrawler');

class PageRanker {

  constructor(hostname, allowCrossDomain = false, MAX_ITERATIONS = 2, DAMPING_FACTOR = 0.4) {

    this._linkcrawler = new LinkCrawler({
      defaultHostName  : hostname,
      allowCrossDomain
    });

    this._id    = uuidv1();
    this._links = {};
    this._linkQueue = [];
    this._mutex = new Mutex();
    this._eventEmitter = new events.EventEmitter();
    this.MAX_ITERATIONS = MAX_ITERATIONS;
    this.DAMPING_FACTOR = DAMPING_FACTOR;

  }

  async _handlePageVisit() {

    //console.log('_handlePageVisit() called')
    //console.log(this._linkQueue);

    const release1 = await this._mutex.acquire();


    const nextUrl = this._linkQueue.shift();

    if (nextUrl === undefined) {
      //_linkQueue is empty. i.e. all links have been visited
      this._eventEmitter.emit(`save-${this._id}`);
      return;
    }

    const formattedUrl = url.format(nextUrl);

    if (formattedUrl in this._links) {
      console.info(`Skipping:: ${formattedUrl}`);
      this._eventEmitter.emit(`append-${this._id}`);
      release1();

      return;
    }

    release1();

    const formatter = this._linkcrawler.getFormattedURL;

    this._linkcrawler.crawl(formattedUrl)
      .then(async (links = []) => {

        const release2 = await this._mutex.acquire();

        const newLinks        = links.filter(l => ! (url.format(formatter(l)) in this._links) );

        this._links[formattedUrl]  = {out: newLinks};


        this._linkQueue.push(...newLinks);

        release2();

        this._eventEmitter.emit(`append-${this._id}`);
      })
      .catch(console.error)

  }


  _handleSave(filePath) {
    console.timeEnd('crawling');
    console.info(`Crawled ${Object.keys(this._links).length} pages.`);
    console.info(`Saving to file "site_map_${this._linkcrawler.getOptions().defaultHostName}.json" ...`);

    let transformedData = {};
    Object.keys(this._links).forEach(key => {
      transformedData[key] = {out : this._links[key].out.map(t => url.format(t))}
    })

    if (filePath === null)
      filePath = `site_map_${this._linkcrawler.getOptions().defaultHostName}.json`;

    fs.writeFile(
      filePath, 
      JSON.stringify(transformedData), 
      err => err && console.error(err)
    );

    this._links = transformedData;

    this._eventEmitter.emit(`compute-${this._id}`);

  }

  _handleCompute() {

    console.log('Computing...');

    const N = Object.keys(this._links).length;

    // Initializing PR for all links;
    Object.keys(this._links).forEach(link => {
      this._links[link].PR = (1.0 / N);
      this._links[link].L  = this._links[link].out.length;
      this._links[link].in = Object.keys(this._links).filter(k => this._links[k].out.includes(link));
    });

    //console.log(Objec.keys(this._links).filter(l => ));

    for (let i = 0; i < this.MAX_ITERATIONS; i += 1) {

      const prevItrLinks = Object.create(this._links);



      Object.keys(this._links).forEach(link => {
        const inBoundLinks = prevItrLinks[link].in;

        let totalPR = 0;

        inBoundLinks.forEach(l => {
          totalPR = totalPR + ( prevItrLinks[l].PR / prevItrLinks[l].L );
        })

        totalPR =  totalPR * this.DAMPING_FACTOR;

        totalPR =  totalPR + ((1 - this.DAMPING_FACTOR) / N);

        this._links[link].PR = totalPR;
      })
      
    }
    
    this._eventEmitter.emit(`release-${this._id}`);
  }

  _handleRelease(callback) {
    this._eventEmitter.removeAllListeners();

    callback(Object.keys(this._links).map(l => ({link: l, PR: this._links[l].PR})));
  }

  rank(startRoute = '/', filePath = null, callback) {

    this._links = {};
    this._linkQueue = [];

    this._eventEmitter.on(`append-${this._id}`, () => this._handlePageVisit());
    this._eventEmitter.on(`save-${this._id}`, () => this._handleSave(filePath));
    this._eventEmitter.on(`compute-${this._id}`, () => this._handleCompute());
    this._eventEmitter.on(`release-${this._id}`,() => this._handleRelease(callback));


    try {
      this._links = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.info('Obtained data from file!');
      this._eventEmitter.emit(`compute-${this._id}`);  
    } catch(e) {
      console.info(`Error occured while reading file:: ${e}\nFetching data from website instead....`);

      this._linkQueue.push(this._linkcrawler.getFormattedURL(startRoute));

      // Initialize crawling
      console.time('crawling');
      this._eventEmitter.emit(`append-${this._id}`);  
    }
    
  }
}

module.exports = PageRanker;