/**
 * authErrors.js — friendly explanations for Supabase Auth failures.
 *
 * Supabase returns terse machine strings ("Invalid login credentials",
 * "over_email_send_rate_limit", …). Students deserve to know what actually
 * happened and what to do next. This module is PURE: error object in, message
 * string out — no state, no side effects, trivially testable.
 *
 * Matching strategy (most specific first):
 *   1. error.code / error.error_code — Supabase's stable machine code
 *   2. error.status                  — HTTP status as a catch-all
 *   3. error.message                 — keyword scan for older responses
 * Anything unmatched falls back to the original message so real information
 * is never hidden from the user.
 */

const FRIENDLY = {
  // ---- Rate limits (free-tier email quota, OTPs, repeated attempts) ------
  over_email_send_rate_limit:
    'Too many confirmation emails were requested in a short time, so the email provider hit its limit. Please wait a few minutes and try again — nothing is wrong with your account.',
  over_request_rate_limit:
    'Too many attempts in a short time. Take a short break, then try again in a minute.',
  over_sms_send_rate_limit:
    'Too many text messages were requested in a short time. Please wait a bit and try again.',

  // ---- Email confirmation flow -------------------------------------------
  email_not_confirmed:
    'This email hasn\'t been confirmed yet. Open the confirmation link we sent you (check your spam folder too), then sign in again.',

  // ---- Credentials ---------------------------------------------------------
  invalid_credentials:
    'We couldn\'t sign you in — that email and password combination doesn\'t match an account. Double-check both, or create a new account if this is your first time here.',
  user_already_registered:
    'An account with this email already exists. Try signing in instead — if you can\'t remember the password, a reset option is coming soon.',
  email_address_invalid:
    'That email address can\'t be used. Please double-check it for typos — disposable or temporary email domains are not accepted.',
  user_banned:
    'This account has been disabled. If you think this is a mistake, please contact support.',
  same_password:
    'Your new password must be different from your current password.',
  weak_password:
    'That password is too weak. Please use at least 6 characters and avoid obviously simple choices like "123456" or "password".',
  signup_disabled:
    'New sign-ups are turned off for GhostFinEx right now. Please try again later.',
  session_expired:
    'Your session has expired. Please sign in again to continue.',
}

/** Supabase error codes arrive in either camelCase or snake_case. */
const ALIASES = {
  email_not_confirmed: 'email_not_confirmed',
  EmailNotConfirmed: 'email_not_confirmed',
  user_already_registered: 'user_already_registered',
  UserAlreadyRegistered: 'user_already_registered',
  email_address_invalid: 'email_address_invalid',
  EmailAddressInvalid: 'email_address_invalid',
  weak_password: 'weak_password',
  WeakPassword: 'weak_password',
  invalid_credentials: 'invalid_credentials',
  InvalidCredentials: 'invalid_credentials',
  session_expired: 'session_expired',
  SessionExpired: 'session_expired',
  same_password: 'same_password',
  SamePassword: 'same_password',
  signup_disabled: 'signup_disabled',
  SignUpDisabled: 'signup_disabled',
  over_email_send_rate_limit: 'over_email_send_rate_limit',
  over_request_rate_limit: 'over_request_rate_limit',
  OverRequestRateLimit: 'over_request_rate_limit',
  over_sms_send_rate_limit: 'over_sms_send_rate_limit',
  user_banned: 'user_banned',
  UserBanned: 'user_banned',
}

export function friendlyAuthError(error) {
  const fallback =
    error?.message || 'Something went wrong while signing you in. Please try again.'
  if (!error) return fallback

  const rawCode = error.code ?? error.error_code
  const code = rawCode != null ? (ALIASES[rawCode] ?? rawCode) : null
  if (code && FRIENDLY[code]) return FRIENDLY[code]

  // Supabase wraps several signup validation cases in 422 / validation_failed.
  if (error.status === 422 || code === 'validation_failed') {
    const msg = error.message ?? ''
    if (/password/i.test(msg)) return FRIENDLY.weak_password
    if (/email/i.test(msg)) return FRIENDLY.email_address_invalid
    return 'Some details look off. Please check your email and password, then try again.'
  }

  if (error.status === 429) return FRIENDLY.over_request_rate_limit

  // Keyword scan for older gotrue responses that ship no machine code.
  const message = (error.message ?? '').toLowerCase()
  if (/email.*not confirmed|not.*confirmed/.test(message)) return FRIENDLY.email_not_confirmed
  if (message.includes('invalid login credentials')) return FRIENDLY.invalid_credentials
  if (message.includes('already registered')) return FRIENDLY.user_already_registered
  if (message.includes('rate limit')) return FRIENDLY.over_request_rate_limit
  if (message.includes('invalid') && message.includes('email')) return FRIENDLY.email_address_invalid
  if (message.includes('password') && (message.includes('weak') || message.includes('at least'))) {
    return FRIENDLY.weak_password
  }
  if (message.includes('fake') || message.includes('anonymous')) return FRIENDLY.invalid_credentials

  return fallback
}
