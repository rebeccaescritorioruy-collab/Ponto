-- Permite configurar, por funcionário, uma duração de intervalo diferente do mínimo
-- legal padrão da faixa de jornada (art. 71 da CLT define só o MÍNIMO — nada impede o
-- escritório de conceder um intervalo maior por acordo, ex.: 6h trabalhadas + 2h de
-- intervalo = 8h à disposição no total). Nulo = usa o mínimo legal da faixa
-- (intervaloPrevistoMinutos), calculado a partir de horas_diarias.
alter table employees add column if not exists intervalo_minutos integer;
