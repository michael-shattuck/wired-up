/**
 * Returns the parameters of a function as an array of strings.
 *
 * @param func The function to describe
 * @returns
 */
export function describeTarget(func: Function): string[] {
  const funcString = func.toString();
  const isClass = /^class\b/.test(funcString);

  if (typeof func !== 'function' && !isClass) {
    throw new Error('Must pass a function or a class');
  }

  if (isClass) {
    const constructorMatch = funcString.match(/constructor\s*\(([^)]*)\)/);
    if (constructorMatch) {
      return parseParams(constructorMatch[1]);
    }
    return [];
  }

  const match = funcString.match(/\(.*\)\s*{/);
  if (match) {
    return parseParams(match[0]);
  }

  const arrowMatch = funcString.match(/\(?[^]*?\)?\s*=>/);
  if (arrowMatch) {
    return parseParams(arrowMatch[0]);
  }

  return [];
}

function parseParams(paramString: string) {
  const params = paramString
    .replace(/[()\s]/gi, '')
    .replace('=>', '')
    .replace('{', '')
    .replace('}', '')
    .replace('async', '')
    .replace('await', '')
    .replace('return', '')
    .replace(';', '')
    .replace(' ', '')
    .replace('\n', '')
    .replace('\r', '')
    .replace('\t', '')
    .split(',');

  // Remove default values
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const equalIndex = param.indexOf('=');
    if (equalIndex > -1) {
      params[i] = param.substring(0, equalIndex);
    }
  }

  return params.filter((param) => !!param);
}
