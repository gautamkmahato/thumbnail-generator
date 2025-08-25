
/**
 * Removes the '```json' prefix and '```' suffix from a given string.
 * It handles optional whitespace around the markers and is case-insensitive for 'json'.
 *
 * @param {string} text The input string that may contain JSON code block markers.
 * @returns {string} The string with the markers removed.
 */
export async function removeJsonCodeBlockMarkers(text) {
  // Regex to match '```json' at the beginning of the string,
  // optionally followed by whitespace.
  // '^' asserts position at the start of the string.
  // '\s*' matches any whitespace character (spaces, tabs, newlines) zero or more times.
  // 'i' flag makes the match case-insensitive for 'json'.
  const startPattern = /^```json\s*/i || /^```markdown\s*/i;

  // Regex to match '```' at the end of the string,
  // optionally preceded by whitespace.
  // '\s*' matches any whitespace character zero or more times.
  // '$' asserts position at the end of the string.
  const endPattern = /\s*```$/;

  // Remove the starting marker
  let cleanedText = text.replace(startPattern, '');

  // Remove the ending marker
  cleanedText = cleanedText.replace(endPattern, '');

  return cleanedText;
}
