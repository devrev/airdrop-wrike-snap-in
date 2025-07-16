const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Return a new array with tests sorted by path
    return Array.from(tests).sort((testA, testB) => {
      // Run extraction.test.ts first, then data_extraction.test.ts
      if (testA.path.includes('extraction.test.ts') && !testB.path.includes('extraction.test.ts')) {
        return -1;
      }
      if (testB.path.includes('extraction.test.ts') && !testA.path.includes('extraction.test.ts')) {
        return 1;
      }
      if (testB.path.includes('data_extraction.test.ts')) return -1;
      
      // Otherwise sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;