export function isInternalURL(url: URL | string) {
  if (!(url instanceof URL)) {
    url = new URL(url, 'internal:/');
  }

  if (url.protocol === 'internal:') {
    return true;
  }

  const currentURL = new URL(window.location.href);

  if (
    url.protocol === currentURL.protocol &&
    url.username === currentURL.username &&
    url.password === currentURL.password &&
    url.host === currentURL.host
  ) {
    return true;
  }

  return false;
}
