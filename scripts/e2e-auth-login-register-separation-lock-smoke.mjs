#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const mapper = read('apps/api/src/modules/auth/auth-error.mapper.ts');
const service = read('apps/api/src/modules/auth/auth.service.ts');
const loginMapper = mapper.slice(mapper.indexOf('export function mapSupabaseLoginError'), mapper.indexOf('export function authErrorResponse'));
assert(/EMAIL_ALREADY_REGISTERED/.test(mapper), 'register conflict code missing');
assert(!/publicAuthError\("EMAIL_ALREADY_REGISTERED"/.test(loginMapper), 'login must not return EMAIL_ALREADY_REGISTERED');
assert(/publicAuthError\("INVALID_CREDENTIALS"/.test(loginMapper), 'login conflicts must map to invalid credentials');
assert(/signInWithPassword/.test(service) && /accessToken/.test(service) && /token/.test(service), 'login usable token contract missing');
assert(/extractBearer/.test(service) && /jwt\.verify/.test(service), '/auth/me bearer token support missing');
assert(/log you in|log in/.test(mapper) && !/sign in instead/.test(mapper), 'customer auth wording must use log in');
console.log('auth login/register separation lock smoke passed');
