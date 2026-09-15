import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as analyticsIsSupported, logEvent } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCag-H8M0jAZa-NjSn4g9sI60Qc9HZPMAM',
  authDomain: 'top10today-f1418.firebaseapp.com',
  projectId: 'top10today-f1418',
  storageBucket: 'top10today-f1418.firebasestorage.app',
  messagingSenderId: '82818664978',
  appId: '1:82818664978:web:220027e56bdd25855ba6cb',
  measurementId: 'G-FXEGQ3XMEW',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Analytics is optional (blocked by some browsers); never let it break the app.
let analytics: ReturnType<typeof getAnalytics> | null = null
analyticsIsSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app)
  })
  .catch(() => {})

/** Fire a tracking event; no-op when Analytics isn't available. */
export function logAppEvent(name: string, params: Record<string, unknown> = {}): void {
  if (analytics) {
    try {
      logEvent(analytics, name, params)
    } catch {
      /* analytics failures must never break UX */
    }
  }
}
