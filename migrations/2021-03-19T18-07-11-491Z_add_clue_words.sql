CREATE TABLE clue_words (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    clue_id uuid REFERENCES clues(id) ON DELETE CASCADE NOT NULL,
    answer text,
    clue_word text,
    text_index smallint
);