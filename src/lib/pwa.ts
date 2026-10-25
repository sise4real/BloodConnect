export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    } else {
      reject(new Error('Geolocation not supported'));
    }
  });
}

export function getGeolocationErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: number }).code
    : undefined;

  if (code === 1) {
    return 'Location access is blocked. In Chrome, open the site controls beside the address, go to Site settings, allow Location, then reload this page.';
  }
  if (code === 2) {
    return 'Your location could not be determined. Check that location services are enabled and try again.';
  }
  if (code === 3) {
    return 'Location lookup timed out. Please try again.';
  }
  if (error instanceof Error) return error.message;
  return 'Could not get your location. Check your browser settings and try again.';
}
