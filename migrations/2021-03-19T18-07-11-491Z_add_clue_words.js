const { db } = require('../config');

CLUE_BATCH_SIZE = 1000;

async function run() {
  const { rows } = await db.query(`
  SELECT
    id,
    answer,
    text
  FROM clues;
  `);

  let skipped = 0;

  for (let i = 0; i < rows.length; i += CLUE_BATCH_SIZE) {
    const clueWordInserts = [];
    for (let j = 0; j < CLUE_BATCH_SIZE; j++) {
      if (i + j >= rows.length) break;
      const clue = rows[i + j];
      if (!clue.text || !clue.answer) {
        skipped++;
        continue;
      }

      const answer = clue.answer.replace(/'/g, "''");
      Array.prototype.push.apply(clueWordInserts, clue.text.split(' ').map((clueWord, idx) => (
        `('${clue.id}', '${answer}', '${clueWord.toUpperCase().replace(/[!?",\.\*]/g, '').replace(/'/g, "''")}', ${idx})`
      )));
    }

    const query = `
INSERT INTO clue_words(clue_id, answer, clue_word, text_index)
VALUES ${clueWordInserts.join(', ')};
`;
    await db.query(query);
    console.log(`done ${i}/${rows.length}`);
  }

  console.log('skipped:', skipped);
}

(async () => {
  try {
    await run();
  } catch (e) {
    console.error(e);
  }

  db.end();
})();