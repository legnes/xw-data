
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE puzzles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    version character varying,
    width smallint,
    height smallint,
    num_clues smallint,
    solution text,
    title text,
    author text,
    copyright text,
    notes text,
    date date,
    nyt_id text UNIQUE
);

CREATE TABLE clues (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    text text,
    answer text,
    direction character varying,
    grid_index smallint,
    grid_number smallint,
    puzzle_id uuid REFERENCES puzzles(id) ON DELETE CASCADE
);

CREATE TABLE crosses (
    clue1_id uuid REFERENCES clues(id) ON DELETE CASCADE NOT NULL,
    clue2_id uuid REFERENCES clues(id) ON DELETE CASCADE NOT NULL,
    CONSTRAINT crosses_pkey PRIMARY KEY (clue1_id, clue2_id)
);