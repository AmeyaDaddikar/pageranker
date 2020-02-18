const url = require('url');
const LinkCrawler = require('./src/linkcrawler');

LinkCrawler.setOptions({
  defaultHostName  : 'vjti.ac.in',
  allowCrossDomain : false,
})

LinkCrawler.crawl('http://vjti.ac.in')
.then(x => x.map(y => console.log(url.format(y))))
.catch(console.error)