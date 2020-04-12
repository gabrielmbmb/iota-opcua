/**
 * Since FIWARE has some forbbiden characters to send in payload, a replacement
 * of this characters is needed because OPC UA protocol does not have any restriction
 * which means we can have a node_id like the following: "ns=3;i=1456"
 */
const FORBIDDEN_CHARACTERS_TRANSLATION = {
  '&gt': '<', // greater than
  '&lt': '>', // less than
  '&dq': '"', // double quotation mark
  '&sq': "'", // single quotation mark
  '&eq': '=', // equal
  '&sc': ';', // semicolon
  '&lp': '(', // left parenthesis
  '&rp': ')', // right parenthesis
};

/**
 * Replaces the translation of the forbidden character.
 *
 * @param {String} string
 * @returns {String} String with replaced characters
 */
function replaceForbiddenCharacters(string) {
  let replaced = string;

  Object.keys(FORBIDDEN_CHARACTERS_TRANSLATION).forEach(translation => {
    replaced = replaced.replace(
      new RegExp(translation, 'g'),
      FORBIDDEN_CHARACTERS_TRANSLATION[translation]
    );
  });

  return replaced;
}

module.exports = {
  replaceForbiddenCharacters,
};
