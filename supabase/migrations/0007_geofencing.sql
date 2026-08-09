-- Localização exigida (opcional, por empresa) pra permitir bater o ponto — quando ativado,
-- bloqueia a marcação se o funcionário não estiver dentro do raio configurado.
alter table employers add column if not exists latitude double precision;
alter table employers add column if not exists longitude double precision;
alter table employers add column if not exists raio_metros integer default 150;
alter table employers add column if not exists bloqueio_localizacao_ativo boolean default false;
