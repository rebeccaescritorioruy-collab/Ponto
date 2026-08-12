-- Altitude do GPS na marcação — só informativa (não confiável o suficiente pra bloquear
-- ponto por andar de prédio, o erro do GPS é do tamanho de vários andares). Fica disponível
-- pro admin como referência extra.
alter table punches add column if not exists altitude double precision;
alter table punches add column if not exists altitude_accuracy_m double precision;
