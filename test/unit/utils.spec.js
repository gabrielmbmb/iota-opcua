const assert = require('assert');
const { replaceForbiddenCharacters } = require('../../src/utils/characters.js');

describe('utils tests', function() {
  describe('characters utils', function() {
    it('should replace all forbidden FIWARE characters', function() {
      const toReplace = '&gt&lt&dq&sq&eq&sc&lp&rp&gt&lt&dq&sq&eq&sc&lp&rp';
      const replaced = replaceForbiddenCharacters(toReplace);
      assert.equal(replaced, '<>"\'=;()<>"\'=;()');
    });
  });
});
