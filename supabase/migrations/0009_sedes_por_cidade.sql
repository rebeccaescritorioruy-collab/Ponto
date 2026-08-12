-- Geofencing deixa de ser por vínculo (CLT/estágio) e passa a ser por cidade/sede: cada
-- funcionário fica ligado a uma cidade, e cada cidade tem seu próprio limitador de região
-- (latitude/longitude/raio), independente do vínculo.

create table if not exists sedes (
  id bigint generated always as identity primary key,
  cidade text not null unique,
  latitude double precision,
  longitude double precision,
  raio_metros integer default 150,
  bloqueio_localizacao_ativo boolean default false
);

alter table employees add column if not exists cidade text;

-- O geofencing por vínculo (employers) foi substituído pelo geofencing por cidade (sedes) —
-- os dados de employers continuam servindo só pra razão social/CNPJ dos comprovantes.
alter table employers drop column if exists latitude;
alter table employers drop column if exists longitude;
alter table employers drop column if exists raio_metros;
alter table employers drop column if exists bloqueio_localizacao_ativo;
