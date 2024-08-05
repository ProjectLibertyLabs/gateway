// Wait 120_000 milliseconds for http://localhost:3000/readyz to return 200
async function main() {
  const start = Date.now();
  while (Date.now() - start < 120000) {
    try {
      const resp = await fetch('http://localhost:3000/readyz');
      if (resp.status === 200) {
        console.log('Ready check passed');
        return;
      }
      console.log(`Retrying. Failed with status: ${resp.status}`);
    } catch (e) {
      if (e?.cause?.code === 'ECONNREFUSED') {
        console.log('Retrying. Connection Failed');
      } else {
        console.log('Retrying. Failed with', e);
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.error('Timeout reached. Ready check failed.');
  process.exit(1);
}

console.log('Waiting for http://localhost:3000/readyz to return 200...');
main()
  .catch(console.error)
  .finally(() => {
    console.log('Complete');
    process.exit(0);
  });
