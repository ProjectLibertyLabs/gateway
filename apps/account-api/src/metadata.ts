/* eslint-disable */
export default async () => {
    const t = {
        ["../../../libs/types/src/dtos/account/accounts.response.dto"]: await import("../../../libs/types/src/dtos/account/accounts.response.dto"),
        ["@polkadot/types-codec/primitive/U32"]: await import("@polkadot/types-codec/primitive/U32"),
        ["../../../libs/types/src/dtos/account/delegation.response.dto"]: await import("../../../libs/types/src/dtos/account/delegation.response.dto"),
        ["../../../libs/types/src/dtos/account/graphs.request.dto"]: await import("../../../libs/types/src/dtos/account/graphs.request.dto"),
        ["../../../libs/types/src/dtos/account/wallet.login.request.dto"]: await import("../../../libs/types/src/dtos/account/wallet.login.request.dto"),
        ["../../../libs/types/src/dtos/account/wallet.login.config.response.dto"]: await import("../../../libs/types/src/dtos/account/wallet.login.config.response.dto"),
        ["../../../libs/types/src/dtos/account/wallet.login.response.dto"]: await import("../../../libs/types/src/dtos/account/wallet.login.response.dto"),
        ["../../../libs/types/src/dtos/account/transaction.response.dto"]: await import("../../../libs/types/src/dtos/account/transaction.response.dto"),
        ["../../../libs/types/src/dtos/account/revokeDelegation.request.dto"]: await import("../../../libs/types/src/dtos/account/revokeDelegation.request.dto"),
        ["../../../libs/types/src/dtos/account/handles.request.dto"]: await import("../../../libs/types/src/dtos/account/handles.request.dto"),
        ["../../../libs/types/src/dtos/account/keys.response.dto"]: await import("../../../libs/types/src/dtos/account/keys.response.dto")
    };
    return { "@nestjs/swagger": { "models": [[import("../../../libs/types/src/dtos/account/accounts.response.dto"), { "HandleResponseDto": { base_handle: { required: true, type: () => String }, canonical_base: { required: true, type: () => String }, suffix: { required: true, type: () => Number } }, "AccountResponseDto": { msaId: { required: true, type: () => String }, handle: { required: false, type: () => t["../../../libs/types/src/dtos/account/accounts.response.dto"].HandleResponseDto } }, "MsaIdResponseDto": { msaId: { required: true, type: () => String } }, "RetireMsaPayloadResponseDto": { encodedExtrinsic: { required: true, type: () => String }, payloadToSign: { required: true, type: () => String }, accountId: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/accounts.request.dto"), { "RetireMsaRequestDto": { signature: { required: true, type: () => String }, accountId: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/delegation.request.dto"), { "ProviderDelegationRequestDto": { msaId: { required: true, type: () => String }, providerId: { required: false, type: () => String } }, "DelegationRequestDto": {} }], [import("../../../libs/types/src/dtos/account/delegation.response.dto"), { "DelegationResponse": { providerId: { required: true, type: () => String }, schemaPermissions: { required: true }, revokedAt: { required: true, type: () => t["@polkadot/types-codec/primitive/U32"].u32 } }, "SchemaDelegation": { schemaId: { required: true, type: () => Number }, revokedAtBlock: { required: false, type: () => Number } }, "Delegation": { providerId: { required: true, type: () => String }, schemaDelegations: { required: true, type: () => [t["../../../libs/types/src/dtos/account/delegation.response.dto"].SchemaDelegation] }, revokedAtBlock: { required: false, type: () => Number } }, "DelegationResponseV2": { msaId: { required: true, type: () => String }, delegations: { required: true, type: () => [t["../../../libs/types/src/dtos/account/delegation.response.dto"].Delegation] } } }], [import("../../../libs/types/src/dtos/account/graphs.request.dto"), { "AddItemActionDto": { type: { required: true, type: () => String, enum: t["../../../libs/types/src/dtos/account/graphs.request.dto"].ItemActionType.ADD_ITEM }, encodedPayload: { required: true, type: () => String } }, "DeleteItemActionDto": { type: { required: true, type: () => String, enum: t["../../../libs/types/src/dtos/account/graphs.request.dto"].ItemActionType.DELETE_ITEM }, index: { required: true, type: () => Number } }, "ItemizedSignaturePayloadDto": { schemaId: { required: true, type: () => Number }, targetHash: { required: true, type: () => Number }, expiration: { required: true, type: () => Number }, actions: { required: true, type: () => [Object] } }, "AddNewPublicKeyAgreementRequestDto": { accountId: { required: true, type: () => String }, payload: { required: true, type: () => t["../../../libs/types/src/dtos/account/graphs.request.dto"].ItemizedSignaturePayloadDto }, proof: { required: true, type: () => String } }, "AddNewPublicKeyAgreementPayloadRequest": { payload: { required: true, type: () => t["../../../libs/types/src/dtos/account/graphs.request.dto"].ItemizedSignaturePayloadDto }, encodedPayload: { required: true, type: () => String } }, "PublicKeyAgreementsKeyPayload": { msaId: { required: true, type: () => String }, newKey: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/handles.request.dto"), { "HandleRequestDto": { accountId: { required: true, type: () => String }, proof: { required: true, type: () => String } }, "ChangeHandlePayloadRequest": { encodedPayload: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/keys.request.dto"), { "KeysRequestDto": { msaOwnerAddress: { required: true, type: () => String }, msaOwnerSignature: { required: true, type: () => String }, newKeyOwnerSignature: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/keys.response.dto"), { "KeysResponse": { msaKeys: { required: true } } }], [import("../../../libs/types/src/dtos/account/revokeDelegation.request.dto"), { "RevokeDelegationPayloadResponseDto": { accountId: { required: true, type: () => String }, providerId: { required: true, type: () => String }, encodedExtrinsic: { required: true, type: () => String }, payloadToSign: { required: true, type: () => String } }, "RevokeDelegationPayloadRequestDto": { signature: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/wallet.login.request.dto"), { "ErrorResponseDto": { message: { required: true, type: () => String } }, "SiwsPayloadDto": { message: { required: true, type: () => String }, signature: { required: true, type: () => String } }, "SignInResponseDto": { siwsPayload: { required: false, type: () => t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].SiwsPayloadDto }, error: { required: false, type: () => t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].ErrorResponseDto } }, "EncodedExtrinsicDto": { pallet: { required: true, type: () => String }, extrinsicName: { required: true, type: () => String }, encodedExtrinsic: { required: true, type: () => String } }, "SignUpResponseDto": { extrinsics: { required: false, type: () => [t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].EncodedExtrinsicDto] }, error: { required: false, type: () => t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].ErrorResponseDto } }, "WalletLoginRequestDto": { signIn: { required: true, type: () => t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].SignInResponseDto }, signUp: { required: true, type: () => t["../../../libs/types/src/dtos/account/wallet.login.request.dto"].SignUpResponseDto } } }], [import("../../../libs/types/src/dtos/account/transaction.response.dto"), { "TransactionResponse": { referenceId: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/wallet.login.config.response.dto"), { "WalletLoginConfigResponseDto": { providerId: { required: true, type: () => String }, siwfUrl: { required: true, type: () => String }, frequencyRpcUrl: { required: true, type: () => String } } }], [import("../../../libs/types/src/dtos/account/wallet.login.response.dto"), { "WalletLoginResponseDto": { referenceId: { required: true, type: () => String }, msaId: { required: false, type: () => String }, publicKey: { required: false, type: () => String } } }]], "controllers": [[import("./controllers/health.controller"), { "HealthController": { "healthz": {}, "livez": {}, "readyz": {} } }], [import("./controllers/v1/accounts-v1.controller"), { "AccountsControllerV1": { "getSIWFConfig": { type: t["../../../libs/types/src/dtos/account/wallet.login.config.response.dto"].WalletLoginConfigResponseDto }, "getAccountForMsa": { type: t["../../../libs/types/src/dtos/account/accounts.response.dto"].AccountResponseDto }, "getAccountForAccountId": { type: t["../../../libs/types/src/dtos/account/accounts.response.dto"].AccountResponseDto }, "postSignInWithFrequency": { type: t["../../../libs/types/src/dtos/account/wallet.login.response.dto"].WalletLoginResponseDto }, "getRetireMsaPayload": { type: t["../../../libs/types/src/dtos/account/accounts.response.dto"].RetireMsaPayloadResponseDto }, "postRetireMsa": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse } } }], [import("./controllers/v1/delegation-v1.controller"), { "DelegationControllerV1": { "getDelegation": { type: t["../../../libs/types/src/dtos/account/delegation.response.dto"].DelegationResponse }, "getRevokeDelegationPayload": { type: t["../../../libs/types/src/dtos/account/revokeDelegation.request.dto"].RevokeDelegationPayloadResponseDto }, "postRevokeDelegation": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse } } }], [import("./controllers/v1/handles-v1.controller"), { "HandlesControllerV1": { "createHandle": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse }, "changeHandle": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse }, "getChangeHandlePayload": { type: t["../../../libs/types/src/dtos/account/handles.request.dto"].ChangeHandlePayloadRequest }, "getHandle": { type: t["../../../libs/types/src/dtos/account/accounts.response.dto"].HandleResponseDto } } }], [import("./controllers/v1/keys-v1.controller"), { "KeysControllerV1": { "addKey": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse }, "getKeys": { type: t["../../../libs/types/src/dtos/account/keys.response.dto"].KeysResponse }, "getPublicKeyAgreementsKeyPayload": { type: t["../../../libs/types/src/dtos/account/graphs.request.dto"].AddNewPublicKeyAgreementPayloadRequest }, "AddNewPublicKeyAgreements": { type: t["../../../libs/types/src/dtos/account/transaction.response.dto"].TransactionResponse } } }], [import("./controllers/v2/delegation-v2.controller"), { "DelegationsControllerV2": { "getDelegation": { type: Object }, "getProviderDelegation": { type: t["../../../libs/types/src/dtos/account/delegation.response.dto"].DelegationResponseV2 } } }]] } };
};