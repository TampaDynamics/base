import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome to the Base app! Please verify your email!'
    },
  },
  groups: ['admin', 'user', 'staff'],
});