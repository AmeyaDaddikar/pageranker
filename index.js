const url = require('url');
const LinkCrawler = require('./src/linkcrawler');
const PageRanker  = require('./src/pageranker');

new PageRanker(
  'vjti.ac.in',  // host on which pagerank is applied
   false,        // allow cross domain (false means only pages of the given host will be crawled)
   2,            // MAX Iterations of pagerank
   0.4           // Damping Factor
   ).rank('', 'site_map_x_vjti.ac.in.json', (vals = []) => {
  let sum = 0;
  vals.forEach(l => sum += l.PR);
  console.log(`Sum of PRs:: ${sum}`);

  const rankedList = vals.sort((a, b) => b.PR - a.PR);
  console.log('MAX PR:: ', rankedList[0])
});
