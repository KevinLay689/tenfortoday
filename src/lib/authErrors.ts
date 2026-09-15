/** Map Firebase error codes to short, human messages. */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'That email already has an account — try signing in.'
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.'
    case 'auth/invalid-email':
      return "That email doesn't look right."
    case 'auth/too-many-requests':
      return 'Too many attempts — please try again in a minute.'
    case 'auth/network-request-failed':
      return 'Network problem — check your connection.'
    case 'auth/admin-restricted-operation':
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled on the Firebase project yet.'
    case 'auth/requires-recent-login':
      return 'Please sign in again to do that.'
    default: {
      const msg = (err as Error)?.message ?? String(err)
      if (msg.includes('permission-denied')) return "You don't have permission to do that."
      return msg.length < 140 ? msg.replace('Firebase: ', '') : 'Something went wrong — try again.'
    }
  }
}
