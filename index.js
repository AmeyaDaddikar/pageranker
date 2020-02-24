const PageRanker  = require('./src/pageranker');

function rankerCalback(vals = []) {
  let sum = 0;
  vals.forEach(l => sum += l.PR);
  console.log(`Sum of PRs:: ${sum}`);

  const rankedList = vals.sort((a, b) => b.PR - a.PR);
  console.log('MAX PR:: ', rankedList[0])
} 

const pageranker = new PageRanker(
        'vjti.ac.in',  // host on which pagerank is applied
        false,        // allow cross domain (false means only pages of the given host will be crawled)
        10,            // MAX Iterations of pagerank
        0.85           // Damping Factor
);

pageranker.rank(
  '',                          // start route
  'site_map_new_2_vjti.ac.in.json',  // file to search for cached pagerank object
  rankerCalback                // callback
);
