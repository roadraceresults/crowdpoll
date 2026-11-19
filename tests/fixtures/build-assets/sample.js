/*
 * This block comment must not survive the build.
 *
 * The file is a stand-in for one of the site's own scripts. It is a classic script: it is
 * loaded with a plain script element, it shares the page's single global scope with every
 * other script, and it publishes what the others need on the window object. Nothing in it
 * is imported and nothing is exported, because the site has no bundler and no modules.
 *
 * The build is expected to treat it exactly as it treats the real scripts. First the text
 * is shortened: every comment goes, the spacing goes, and the names that live inside a
 * function are replaced by short ones. The names declared at the top level are kept, since
 * another script may call them, and so are the names of properties, since pages, responses
 * from the server and the document itself spell them the same way. Then the text strings
 * are lifted out of the places where they are used and gathered into one table at the head
 * of the file, each entry encoded, with a small routine that decodes an entry the first
 * time it is asked for and remembers the answer afterwards.
 *
 * That routine has a price. It is the same few hundred bytes in every script, however short
 * the script is, so a file of three lines would come out larger than it went in, and the
 * build would rightly refuse it: one of its checks adds up the compressed size of everything
 * it transformed and stops when the total has grown. A fixture that tripped that check would
 * make every test of a transformed build fail for a reason that has nothing to do with the
 * behaviour under test. So this comment is long on purpose. Removing it saves far more than
 * the routine costs, as removing the comments of the real scripts does, and the fixture
 * passes the size check the same way the site does.
 *
 * The prose is varied on purpose as well. A compressor finds repeated lines and stores them
 * once, so a comment made of one sentence copied fifty times would add almost nothing to the
 * compressed size before the build and removing it would save almost nothing after. Ordinary
 * sentences, each different from the last, compress the way real documentation does: to
 * somewhat under half their length. That is the saving the size check needs to see.
 *
 * What the tests look for in the built copy of this file:
 *
 *   - neither this comment nor the line comment further down is present;
 *   - the top-level function keeps its name, and the object published on the window still
 *     has a working greet function when the built file is run;
 *   - the counter inside the greeting function has lost its descriptive name;
 *   - the two message strings cannot be found as plain text;
 *   - nothing in the file builds code from text at run time;
 *   - the file still compiles, including the optional chaining and the nullish coalescing
 *     it uses, which must come out as they went in and not be rewritten into older forms.
 *
 * With source maps asked for, a position in the built file must lead back to the line in
 * this file where the top-level function is declared, which is why that function sits well
 * below this comment and not on the first line: an off-by-everything mistake in joining the
 * two stages' maps would otherwise go unnoticed.
 *
 * A word on what the build does not promise. Anyone who receives a script can run it, pause
 * it and print whatever it holds, and there are public tools that put a string table back
 * where it came from in a few seconds. The transformation raises the effort of a casual
 * reading; it does not hide anything from a determined one, and it is no place to keep a key,
 * a token or a private address. Whatever must stay private stays on the server, where the
 * rules about who may see which poll are enforced whether or not the visitor's copy of the
 * scripts has been tampered with. The tests of this fixture therefore check that the strings
 * are out of plain sight, never that they are beyond recovery.
 *
 * The other files in this folder each cover one rule. The style sheet has a comment to lose
 * and two breakpoints to keep. The page has a comment to lose, three references and two
 * date markers to keep, and a sentence whose words sit either side of a link, where a
 * careless removal of spacing would run them together. The empty script shows that a file
 * with nothing in it is copied and not reported as untouched. The image and the file under
 * the vendor folder show that anything the site did not write is left byte for byte alone.
 *
 * Nothing here is used by the site. The words about visitors and greetings are placeholders
 * chosen to be easy to search for and impossible to confuse with anything the real scripts
 * say. Change them only together with the tests that name them.
 */

// this line comment must not survive either

function sharedHelper(value) {
  return String(value ?? "nobody").trim();
}

function describeVisitor(visitor) {
  const name = sharedHelper(visitor?.name);
  const town = sharedHelper(visitor?.town);
  return name + " of " + town;
}

function greet(visitor) {
  function countLetters(text) {
    let localCounter = 0;
    for (const letter of text) {
      if (letter !== " ") localCounter += 1;
    }
    return localCounter;
  }

  const who = describeVisitor(visitor);
  const message = "A readable message for the visitor";
  const marker = "another-known-string";
  return {
    line: message + ": " + who,
    letters: countLetters(who),
    marker: marker,
    polite: visitor?.polite ?? true
  };
}

function farewell(visitor) {
  const who = describeVisitor(visitor);
  const parting = "Thank you for calling, and a safe journey home";
  const reminder = "The door at the end of the corridor is the way out";
  return [parting, reminder, who].join(". ");
}

function directions(visitor) {
  const steps = [
    "Take the stairs beside the reading room",
    "Turn left where the two passages meet",
    "Ask at the desk under the tall window",
    "Leave your umbrella in the stand by the door"
  ];
  const who = describeVisitor(visitor);
  return steps.map((step, index) => String(index + 1) + ". " + step + ", " + who);
}

window.Sample = { greet, farewell, directions };
