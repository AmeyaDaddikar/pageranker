const url = require('url');
const LinkCrawler = require('./src/linkcrawler');

let linkcrawler = new LinkCrawler();

linkcrawler.setOptions({
  defaultHostName  : 'vjti.ac.in',
  allowCrossDomain : false,
})

linkcrawler.crawl('http://vjti.ac.in')
.then(x => x.map(y => console.log(url.format(y))))
.catch(console.error)