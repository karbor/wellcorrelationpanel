

const patternMap = new Map<(string|number), patternMapEntry>();

interface patternMapEntry {
  code: (string|number), patternImage: string //CanvasPattern
}

export function getPatterns(codes: (string|number)[]) {
  const missing = codes.filter(code => !patternMap.has(code));

  const newPatterns: patternMapEntry[] = [
    {code: '1', patternImage: "static/media/src/demo/example-data/patterns/Anhydrite.gif"},
    {code: '2', patternImage: "static/media/src/demo/example-data/patterns/Bitumenious.gif"}
  ]; // TODO: load patterns here

  newPatterns.forEach(patternEntry => {
    if (patternEntry.code && patternEntry.patternImage) {
      patternMap.set(patternEntry.code, patternEntry);
    }
  });
  return [...patternMap.values()].filter(v => codes.includes(v.code));
}
