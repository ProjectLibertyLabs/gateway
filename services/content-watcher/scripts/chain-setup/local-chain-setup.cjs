const { options } = require("@frequency-chain/api-augment");
const { WsProvider, ApiPromise, Keyring } = require("@polkadot/api");
const { deploy } = require("@dsnp/frequency-schemas/cli/deploy");

// Given a list of events, a section and a method,
// returns the first event with matching section and method.
const eventWithSectionAndMethod = (events, section, method) => {
  const evt = events.find(({ event }) => event.section === section && event.method === method);
  return evt?.event;
};

const main = async () => {
  console.log("A quick script that will setup a clean localhost instance of Frequency for DSNP ");

  const providerUri = "ws://127.0.0.1:9944";
  const provider = new WsProvider(providerUri);
  const api = await ApiPromise.create({ provider, throwOnConnect: true, ...options });
  const keys = new Keyring().addFromUri("//Alice", {}, "sr25519");

  // Create alice msa
  await new Promise((resolve, reject) => {
    console.log("Creating an MSA...");
    api.tx.msa.create()
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "msa", "MsaCreated");
          if (evt) {
            const id = evt?.data[0];
            console.log("SUCCESS: MSA Created:" + id);
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  // Create alice provider
  await new Promise((resolve, reject) => {
    console.log("Creating an Provider...");
    api.tx.msa.createProvider("alice")
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "msa", "ProviderCreated");
          if (evt) {
            const id = evt?.data[0];
            console.log("SUCCESS: Provider Created:" + id);
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  // Alice provider get Capacity
  await new Promise((resolve, reject) => {
    console.log("Staking for Capacity...");
    api.tx.capacity.stake("1", 500_000 * Math.pow(8, 10))
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "capacity", "Staked");
          if (evt) {
            console.log("SUCCESS: Provider Staked:", evt.data.toHuman());
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  // Deploy Schemas
  await deploy();

  console.log("Setup Complete!");
}

main().catch(console.error).finally(process.exit);
