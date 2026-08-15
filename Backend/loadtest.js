const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const TOTAL_REQUESTS = 500;
const CONCURRENCY = 20; // how many in-flight at once

const stocks = ['TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'WIPRO'];

function randomOrder() {
  const name = stocks[Math.floor(Math.random() * stocks.length)];
  const mode = Math.random() > 0.5 ? 'BUY' : 'SELL';
  return {
    name,
    qty: Math.floor(Math.random() * 10) + 1,
    price: (Math.random() * 1000 + 100).toFixed(2),
    mode,
  };
}

async function placeOrder(order) {
  const start = Date.now();
  try {
    const res = await axios.post(`${BASE_URL}/newOrder`, order);
    return { success: true, duration: Date.now() - start, status: res.status };
  } catch (err) {
    return {
      success: false,
      duration: Date.now() - start,
      status: err.response ? err.response.status : 'NO_RESPONSE',
      error: err.response ? err.response.data.error : err.message,
    };
  }
}

async function runBatch(batchSize) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(placeOrder(randomOrder()));
  }
  return Promise.all(promises);
}

async function main() {
  const results = [];
  let sent = 0;

  console.log(`Starting load test: ${TOTAL_REQUESTS} requests, concurrency ${CONCURRENCY}`);
  const overallStart = Date.now();

  while (sent < TOTAL_REQUESTS) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - sent);
    const batchResults = await runBatch(batchSize);
    results.push(...batchResults);
    sent += batchSize;
    process.stdout.write(`\rSent: ${sent}/${TOTAL_REQUESTS}`);
  }

  const totalTime = Date.now() - overallStart;
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);
  const durations = successes.map(r => r.duration).sort((a, b) => a - b);

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const max = durations[durations.length - 1];

  console.log('\n\n=== LOAD TEST RESULTS ===');
  console.log(`Total requests: ${TOTAL_REQUESTS}`);
  console.log(`Successful: ${successes.length}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`Total wall time: ${totalTime}ms`);
  console.log(`Avg latency: ${avg.toFixed(2)}ms`);
  console.log(`p50 latency: ${p50}ms`);
  console.log(`p95 latency: ${p95}ms`);
  console.log(`Max latency: ${max}ms`);

  if (failures.length > 0) {
    console.log('\nSample failures:');
    failures.slice(0, 5).forEach(f => console.log(`  ${f.status}: ${f.error}`));
  }
}

main();
