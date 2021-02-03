
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE puzzles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
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
    nyt_id text
);
-- ALTER TABLE puzzles OWNER TO me;
ALTER TABLE ONLY puzzles
    ADD CONSTRAINT puzzles_pkey PRIMARY KEY (id);

CREATE TABLE clues (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    text text,
    answer text,
    direction character varying,
    grid_index smallint,
    grid_number smallint,
    puzzle_id uuid
);
-- ALTER TABLE clues OWNER TO me;
ALTER TABLE ONLY clues
    ADD CONSTRAINT clues_pkey PRIMARY KEY (id);

ALTER TABLE ONLY clues
    ADD CONSTRAINT fk_puzzleid FOREIGN KEY (puzzle_id) REFERENCES puzzles(id);
