import { createWebhookRsp, IBaseWebhookResponse } from '#webhooks-lib/helpers/createWebhookRsp.helper';
import { TransactionType } from '#types/tx-notification-webhook';

const buildTestWebhookResponse = (withType: TransactionType): IBaseWebhookResponse => {
  const txStatus = {
    birth: 1,
    death: 10,
    referenceId: 'abcdefg',
    txHash: '0xabcd1234',
    type: undefined,
    blockHash: 'abcd',
  };
  return {
    ...txStatus,
    type: withType,
  } as IBaseWebhookResponse;
};

describe('createWebhookRsp helper', () => {
  type TestCase = {
    txType: TransactionType;
    options: any;
  };
  it.each([
    {
      txType: TransactionType.ON_CHAIN_CONTENT,
      options: { schemaId: '2342', intentId: '2342', msaId: '333' },
    },
    { txType: TransactionType.ADD_KEY, options: { newPublicKey: 'exists' } },
    {
      txType: TransactionType.ADD_PUBLIC_KEY_AGREEMENT,
      options: { schemaId: '2342', intentId: '2342', msaId: '333' },
    },
    { txType: TransactionType.CREATE_HANDLE, options: { handle: 'exists' } },
    {
      txType: TransactionType.CHANGE_HANDLE,
      options: { handle: 'exists', schemaId: 'exists', intentId: 'exists' },
    },
    { txType: TransactionType.SIWF_SIGNUP, options: { handle: 'exists', accountId: 'exists' } },
    {
      txType: TransactionType.CAPACITY_BATCH,
      options: { capacityWithdrawnEvent: { msaId: 'exists', amount: 'exists' } },
    },
    { txType: TransactionType.RETIRE_MSA, options: {} },
    { txType: TransactionType.REVOKE_DELEGATION, options: {} },
  ])(`When transactionType = $txType it returns correct response`, ({ txType, options }: TestCase) => {
    const testResponse = buildTestWebhookResponse(txType);
    const result = createWebhookRsp(testResponse, options);
    expect(result.transactionType).toEqual(txType);
  });
});
