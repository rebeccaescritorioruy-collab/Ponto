-- Permite lançar um dia de carga reduzida (ex.: estagiário com prova na faculdade, que
-- trabalha só metade da jornada naquele dia) — diferente da falta abonada, aqui o
-- funcionário trabalha de verdade, só que contra uma meta menor naquele dia específico.
alter table treatments drop constraint if exists treatments_kind_check;
alter table treatments add constraint treatments_kind_check check (kind in ('falta', 'inclusao', 'carga_reduzida'));
alter table treatments add column if not exists percentual_carga integer;
