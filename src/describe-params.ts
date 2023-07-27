/**
 * Returns the parameters of a function as an array of strings.
 * 
 * @param func The function to describe
 * @returns 
 */
export function describeParams(func: (...args: any[]) => any): string[] {
  const funcString = func.toString();
  const arrowMatch = funcString.match(/\(?[^]*?\)?\s*=>/);

  if (arrowMatch) {
    return arrowMatch[0]
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
  }

  const match = funcString.match(/\([^]*?\)/);
  return match
    ? match[0].replace(/[()\s]/gi, '').split(',')
    : [];
}