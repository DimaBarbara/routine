/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      ['api', 'web', 'contracts', 'auth', 'wishlist', 'finance', 'deps', 'ci', 'repo', 'config'],
    ],
  },
};
