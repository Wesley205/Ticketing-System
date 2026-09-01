export function buildQueryParams(input = {}) {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      });
      return;
    }

    params.set(key, String(value));
  });

  return params;
}
