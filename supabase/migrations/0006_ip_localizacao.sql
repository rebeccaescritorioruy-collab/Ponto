-- Registra o IP e a localização (GPS, quando autorizada pelo funcionário) de cada marcação
-- de ponto real — auditoria de onde/de que rede o ponto foi batido.
alter table punches add column if not exists ip text;
alter table punches add column if not exists latitude double precision;
alter table punches add column if not exists longitude double precision;
alter table punches add column if not exists accuracy_m double precision;
alter table punches add column if not exists location_error text;
