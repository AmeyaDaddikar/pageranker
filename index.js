const url = require('url');
const LinkCrawler = require('./src/linkcrawler');
const PageRanker  = require('./src/pageranker');

new PageRanker('vjti.ac.in', false).rank();
// let linkcrawler = new LinkCrawler({
//   defaultHostName  : 'vjti.ac.in',
//   allowCrossDomain : false,
// });

// linkcrawler.crawl('')
// .then(x => x.map(y => console.log(url.format(y))))
// .catch(console.error)