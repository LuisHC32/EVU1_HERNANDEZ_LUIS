CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  titulo      VARCHAR(120)     NOT NULL CHECK (titulo <> ''),
  descripcion TEXT             NOT NULL DEFAULT '',
  completada  BOOLEAN          NOT NULL DEFAULT false,
  photo_uri   TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  address     TEXT,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);
