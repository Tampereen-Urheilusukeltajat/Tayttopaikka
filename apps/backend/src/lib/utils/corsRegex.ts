// Utility to construct the CORS regex for allowed origins
export function makeCorsRegex(frontendHostname: string): RegExp {
  // Remove protocol and port from hostname if present
  const cleanHost = frontendHostname.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
  // Escape dots in the hostname for regex matching
  const escapedHost = cleanHost.replace(/\./g, '\\.');
  // Match: optional protocol, optional subdomains, main domain, optional port
  return new RegExp(
    `^(https?:\\/\\/)?(([\\w-]+\\.)+)?${escapedHost}(:\\d+)?$`
  );
}
