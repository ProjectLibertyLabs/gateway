# Become a Provider

A Provider is a special kind of user account on Frequency, capable of executing certain operations on behalf of other users (delegators).
Any organization wishing to deploy an application that will act on behalf of users must first register as a Provider.
This guide will walk you through the steps to becoming a Provider on the Frequency Testnet. See [How to Become a Provider on Mainnet](#mainnet), if you are ready to move to production.

## **Step 1: Generate Your Keys**

There are various wallets that can generate and secure Frequency compatible keys, including:

- [Polkadot Extension](https://polkadot.js.org/extension/)
- [Talisman](https://www.talisman.xyz)
- [See more](https://polkadot.com/get-started/wallets)

This onboarding process will guide you through the creation of an account and the creation of a Provider Control Key which will be required for many different transactions.

## **Step 2: Acquire Testnet Tokens**

Taking the account generated in Step 1, visit the Frequency Testnet Faucet and get tokens: [Testnet Faucet](https://faucet.testnet.frequency.xyz/)

## **Step 3: Create a Testnet Provider**

Creating your provider account is easy via the [Provider Dashboard](https://provider.frequency.xyz/).

- Visit the [Provider Dashboard](https://provider.frequency.xyz/)
- Select `Become a Provider`
- Select the `Testnet Paseo` network
- Connect the Application Account created earlier
- Select `Create an MSA` and approve the transaction popups
- Choose a public Provider name (e.g. "Cool Test App") and continue via `Create Provider`

## **Step 4: Gain Capacity**

Capacity is the ability to perform some transactions without token cost.
All interactions with the chain that an application does on behalf of a user can be done with Capacity.

In the [Provider Dashboard](https://provider.frequency.xyz/), login and select `Stake to Provider` and stake 100 XRQCY Tokens.

## **Step 5: Done!**

You are now registered as a Provider on Testnet and have Capacity to do things like support users with [Single Sign On](./SSO.md).

You can also use the [Provider Dashboard](https://provider.frequency.xyz/) to add additional Control Keys for safety.

## **Ready to Become a Provider on Mainnet? { #mainnet }**

Want to make the next step to becoming a Provider on Mainnet?

1. Securely generate a Frequency Mainnet Account
2. Backup your seed phrase for the account.
3. Acquire a small amount of FRQCY tokens.
4. Complete the registration with the generated Frequency Mainnet Account via the [Provider Dashboard](https://provider.frequency.xyz/).

The registration process is currently gated to prevent malicious Providers.
