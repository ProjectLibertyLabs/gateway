/* eslint-disable func-names */
/* eslint-disable no-extend-native */
// eslint-disable-next-line dot-notation
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};
