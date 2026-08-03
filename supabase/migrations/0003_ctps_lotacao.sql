-- Campos usados na folha de ponto exportada (CTPS e lotação/unidade do funcionário).
alter table employees add column if not exists ctps text;
alter table employees add column if not exists lotacao text;
