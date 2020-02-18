const url  = require('url');
const fs   = require('fs');

const Mutex  = require('async-mutex').Mutex;
const uuidv1 = require('uuid/v1');
const events = require('events');

const LinkCrawler = require('./linkcrawler');

class PageRanker {

  constructor(hostname, allowCrossDomain = false) {

    this._linkcrawler = new LinkCrawler({
      defaultHostName  : hostname,
      allowCrossDomain
    });

    this._id    = uuidv1();
    this._links = {};
    this._linkQueue = [];
    this._mutex = new Mutex();
    this._eventEmitter = new events.EventEmitter();

  }

  async _handlePageVisit() {

    //console.log('_handlePageVisit() called')
    //console.log(this._linkQueue);

    const release1 = await this._mutex.acquire();


    const nextUrl = this._linkQueue.shift();

    if (nextUrl === undefined) {
      //_linkQueue is empty. i.e. all links have been visited
      this._eventEmitter.emit(`release-${this._id}`);
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

  _handleRelease() {
    console.timeEnd('crawling');
    this._eventEmitter.removeAllListeners();
    console.info(`Crawled ${Object.keys(this._links).length} pages.`);

    console.info('Saving to file...');

    let saveData = {};
    Object.keys(this._links).forEach(key => {
      saveData[key] = {out : this._links[key].out.map(t => url.format(t))}
    })

    fs.appendFile('site_map.json', JSON.stringify(saveData), console.error);
  }

  rank(startRoute = '/') {

    this._links = {};
    this._linkQueue.push(this._linkcrawler.getFormattedURL(startRoute));

    this._eventEmitter.on(`append-${this._id}`, () => this._handlePageVisit());
    this._eventEmitter.on(`release-${this._id}`,() => this._handleRelease());

    // Initialize crawling
    console.time('crawling');
    this._eventEmitter.emit(`append-${this._id}`);

    
  }
}

module.exports = PageRanker;