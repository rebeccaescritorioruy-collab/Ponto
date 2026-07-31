-- Rode este script no SQL Editor do Supabase antes de usar comprovante,
-- espelho de ponto e tratamento de faltas/inclusões.

-- Remove uma tabela treatments de tentativa anterior, caso exista com esquema divergente.
drop table if exists treatments cascade;

-- Hash de cada marcação (usado no comprovante de registro de ponto)
alter table punches add column if not exists hash text;

-- Faltas abonadas e inclusões de marcação esquecida, lançadas pelo administrador
create table treatments (
  id bigint generated always as identity primary key,
  cpf text not null references employees(cpf),
  date date not null,
  kind text not null check (kind in ('falta', 'inclusao')),
  motivo_categoria text,
  motivo text,
  tipo_marcacao text,
  horario timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists treatments_cpf_date_idx on treatments (cpf, date);
