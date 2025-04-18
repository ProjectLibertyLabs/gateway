import { initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';
// eslint-disable-next-line import/no-relative-packages
import { setupProviderAndUsers } from '../e2e-setup.mock.spec';

const FREQUENCY_API_WS_URL = process.env.FREQUENCY_API_WS_URL || 'ws://127.0.0.1:9944';

async function main() {
  await cryptoWaitReady();
  log.setLevel('trace');
  console.log('Connecting...');
  await initialize(FREQUENCY_API_WS_URL);

  // eslint-disable-next-line no-use-before-define
  await revokeDelegation();
}

async function revokeDelegation() {
  await cryptoWaitReady();
  const { provider, users } = await setupProviderAndUsers();
  const providerId = provider.msaId?.toString();
  const { keypair } = users[1];
  const accountId = keypair.address;
  const getPath: string = `http:/localhost:3013/v1/delegation/revokeDelegation/${accountId}/${providerId}`;
  console.log(`[Test] Making GET request to: ${getPath}`);
  let response;
  try {
    response = await axios.get(getPath);
    console.log(`[Test] GET request successful`);
    console.log(`[Test] Response status: ${response.status}`);
  } catch (error) {
    console.error(`[Test] GET request failed to: ${getPath}`);
    if (axios.isAxiosError(error)) {
      console.error('[Test] Axios Error Details:');
      console.error(`- Message: ${error.message}`);
      console.error(`- Code: ${error.code}`);
      console.error(`- Status: ${error.response?.status}`);
      console.error(`- Status Text: ${error.response?.statusText}`);
      console.error('- Request Config:', {
        method: error.config?.method,
        url: error.config?.url,
        timeout: error.config?.timeout,
        headers: error.config?.headers,
      });
      if (error.response?.data) {
        console.error('- Response Data:', error.response.data);
      }
    } else {
      console.error('[Test] Non-Axios Error:', error);
    }
    throw error;
  }
  const revokeDelegationPayloadResponse = response.data;
  console.log(`RevokeDelegationPayloadResponse = ${JSON.stringify(revokeDelegationPayloadResponse)}`);

  // From github:https://github.com/polkadot-js/tools/issues/175
  // Use the withType option to sign the payload to get the prefix 0x01
  // which specifies the SR25519 type of the signature and avoids getting and error about an enum in the next signAsync step
  const signature: Uint8Array = keypair.sign(revokeDelegationPayloadResponse.payloadToSign, { withType: true });
  console.log('signature:', u8aToHex(signature));

  const revokeDelegationRequest = {
    accountId,
    providerId,
    encodedExtrinsic: revokeDelegationPayloadResponse.encodedExtrinsic,
    payloadToSign: revokeDelegationPayloadResponse.payloadToSign,
    signature: u8aToHex(signature),
  };
  console.log(`revokeDelegationRequest = ${JSON.stringify(revokeDelegationRequest)}`);

  const postPath = 'http:/localhost:3013/v1/delegation/revokeDelegation';
  console.log(`[Test] Making POST request to: ${postPath}`);
  console.log(`[Test] Request payload:`, revokeDelegationRequest);
  try {
    const revokeResponse = await axios.post(postPath, revokeDelegationRequest);
    console.log(`[Test] POST request successful`);
    console.log(`[Test] Response status: ${revokeResponse.status}`);
  } catch (error) {
    console.error(`[Test] POST request failed to: ${postPath}`);
    if (axios.isAxiosError(error)) {
      console.error('[Test] Axios Error Details:');
      console.error(`- Message: ${error.message}`);
      console.error(`- Code: ${error.code}`);
      console.error(`- Status: ${error.response?.status}`);
      console.error(`- Status Text: ${error.response?.statusText}`);
      console.error('- Request Config:', {
        method: error.config?.method,
        url: error.config?.url,
        timeout: error.config?.timeout,
        headers: error.config?.headers,
      });
      if (error.response?.data) {
        console.error('- Response Data:', error.response.data);
      }
    } else {
      console.error('[Test] Non-Axios Error:', error);
    }
    throw error;
  }
}

main()
  .catch((r) => {
    console.error(r);
    process.exit(1);
  })
  .finally(process.exit);
