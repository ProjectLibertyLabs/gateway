/* eslint-disable */
export default async () => {
    const t = {
        ["../../../libs/account-lib/src/types/dtos/graphs.request.dto"]: await import("../../../libs/account-lib/src/types/dtos/graphs.request.dto"),
        ["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"]: await import("../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"),
        ["../../../libs/account-lib/src/types/dtos/accounts.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/accounts.response.dto"),
        ["@polkadot/types-codec/primitive/U32"]: await import("@polkadot/types-codec/primitive/U32"),
        ["../../../libs/account-lib/src/types/dtos/wallet.login.config.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/wallet.login.config.response.dto"),
        ["../../../libs/account-lib/src/types/dtos/wallet.login.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/wallet.login.response.dto"),
        ["../../../libs/account-lib/src/types/dtos/delegation.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/delegation.response.dto"),
        ["../../../libs/account-lib/src/types/dtos/transaction.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/transaction.response.dto"),
        ["../../../libs/account-lib/src/types/dtos/handles.request.dto"]: await import("../../../libs/account-lib/src/types/dtos/handles.request.dto"),
        ["../../../libs/account-lib/src/types/dtos/keys.response.dto"]: await import("../../../libs/account-lib/src/types/dtos/keys.response.dto")
    };
    return { "@nestjs/swagger": { "models": [[import("../../../libs/account-lib/src/types/dtos/keys.request.dto"), { "KeysRequestDto": { msaOwnerAddress: { required: true, type: () => String }, msaOwnerSignature: { required: true, type: () => String }, newKeyOwnerSignature: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/handles.request.dto"), { "HandleRequestDto": { accountId: { required: true, type: () => String }, proof: { required: true, type: () => String } }, "ChangeHandlePayloadRequest": { encodedPayload: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/graphs.request.dto"), { "AddItemActionDto": { type: { required: true, type: () => String, enum: t["../../../libs/account-lib/src/types/dtos/graphs.request.dto"].ItemActionType.ADD_ITEM }, encodedPayload: { required: true, type: () => String } }, "DeleteItemActionDto": { type: { required: true, type: () => String, enum: t["../../../libs/account-lib/src/types/dtos/graphs.request.dto"].ItemActionType.DELETE_ITEM }, index: { required: true, type: () => Number } }, "ItemizedSignaturePayloadDto": { schemaId: { required: true, type: () => Number }, targetHash: { required: true, type: () => Number }, expiration: { required: true, type: () => Number }, actions: { required: true, type: () => [Object] } }, "AddNewPublicKeyAgreementRequestDto": { accountId: { required: true, type: () => String }, payload: { required: true, type: () => t["../../../libs/account-lib/src/types/dtos/graphs.request.dto"].ItemizedSignaturePayloadDto }, proof: { required: true, type: () => String } }, "AddNewPublicKeyAgreementPayloadRequest": { payload: { required: true, type: () => t["../../../libs/account-lib/src/types/dtos/graphs.request.dto"].ItemizedSignaturePayloadDto }, encodedPayload: { required: true, type: () => String } }, "PublicKeyAgreementsKeyPayload": { msaId: { required: true, type: () => String }, newKey: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"), { "ErrorResponseDto": { message: { required: true, type: () => String } }, "SiwsPayloadDto": { message: { required: true, type: () => String }, signature: { required: true, type: () => String } }, "SignInResponseDto": { siwsPayload: { required: false, type: () => t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].SiwsPayloadDto }, error: { required: false, type: () => t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].ErrorResponseDto } }, "EncodedExtrinsicDto": { pallet: { required: true, type: () => String }, extrinsicName: { required: true, type: () => String }, encodedExtrinsic: { required: true, type: () => String } }, "SignUpResponseDto": { extrinsics: { required: false, type: () => [t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].EncodedExtrinsicDto] }, error: { required: false, type: () => t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].ErrorResponseDto } }, "WalletLoginRequestDto": { signIn: { required: true, type: () => t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].SignInResponseDto }, signUp: { required: true, type: () => t["../../../libs/account-lib/src/types/dtos/wallet.login.request.dto"].SignUpResponseDto } } }], [import("../../../libs/account-lib/src/types/dtos/accounts.response.dto"), { "HandleResponseDto": { base_handle: { required: true, type: () => String }, canonical_base: { required: true, type: () => String }, suffix: { required: true, type: () => Number } }, "AccountResponseDto": { msaId: { required: true, type: () => String }, handle: { required: false, type: () => t["../../../libs/account-lib/src/types/dtos/accounts.response.dto"].HandleResponseDto } }, "MsaIdResponse": { msaId: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/delegation.response.dto"), { "DelegationResponse": { providerId: { required: true, type: () => String }, schemaPermissions: { required: true }, revokedAt: { required: true, type: () => t["@polkadot/types-codec/primitive/U32"].u32 } } }], [import("../../../libs/account-lib/src/types/dtos/keys.response.dto"), { "KeysResponse": { msaKeys: { required: true } } }], [import("../../../libs/account-lib/src/types/dtos/transaction.response.dto"), { "TransactionResponse": { referenceId: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/wallet.login.config.response.dto"), { "WalletLoginConfigResponseDto": { providerId: { required: true, type: () => String }, siwfUrl: { required: true, type: () => String }, frequencyRpcUrl: { required: true, type: () => String } } }], [import("../../../libs/account-lib/src/types/dtos/wallet.login.response.dto"), { "WalletLoginResponseDto": { referenceId: { required: true, type: () => String }, msaId: { required: false, type: () => String }, publicKey: { required: false, type: () => String } } }]], "controllers": [[import("./controllers/health.controller"), { "HealthController": { "healthz": {}, "livez": {}, "readyz": {} } }], [import("./controllers/v1/accounts-v1.controller"), { "AccountsControllerV1": { "getSIWFConfig": { type: t["../../../libs/account-lib/src/types/dtos/wallet.login.config.response.dto"].WalletLoginConfigResponseDto }, "getAccountForMsa": { type: t["../../../libs/account-lib/src/types/dtos/accounts.response.dto"].AccountResponseDto }, "getAccountForPublicKey": { type: t["../../../libs/account-lib/src/types/dtos/accounts.response.dto"].AccountResponseDto }, "postSignInWithFrequency": { type: t["../../../libs/account-lib/src/types/dtos/wallet.login.response.dto"].WalletLoginResponseDto } } }], [import("./controllers/v1/delegation-v1.controller"), { "DelegationControllerV1": { "getDelegation": { type: t["../../../libs/account-lib/src/types/dtos/delegation.response.dto"].DelegationResponse } } }], [import("./controllers/v1/handles-v1.controller"), { "HandlesControllerV1": { "createHandle": { type: t["../../../libs/account-lib/src/types/dtos/transaction.response.dto"].TransactionResponse }, "changeHandle": { type: t["../../../libs/account-lib/src/types/dtos/transaction.response.dto"].TransactionResponse }, "getChangeHandlePayload": { type: t["../../../libs/account-lib/src/types/dtos/handles.request.dto"].ChangeHandlePayloadRequest }, "getHandle": { type: t["../../../libs/account-lib/src/types/dtos/accounts.response.dto"].HandleResponseDto } } }], [import("./controllers/v1/keys-v1.controller"), { "KeysControllerV1": { "addKey": { type: t["../../../libs/account-lib/src/types/dtos/transaction.response.dto"].TransactionResponse }, "getKeys": { type: t["../../../libs/account-lib/src/types/dtos/keys.response.dto"].KeysResponse }, "getPublicKeyAgreementsKeyPayload": { type: t["../../../libs/account-lib/src/types/dtos/graphs.request.dto"].AddNewPublicKeyAgreementPayloadRequest }, "AddNewPublicKeyAgreements": { type: t["../../../libs/account-lib/src/types/dtos/transaction.response.dto"].TransactionResponse } } }]] } };
};