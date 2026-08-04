-- Art. 10, §2º da Lei 11.788/2008: estágio de curso que alterna teoria e prática pode ter
-- jornada de até 40h semanais (8h/dia) nos períodos sem aula presencial, desde que previsto
-- no projeto pedagógico do curso/instituição — o escritório marca esse campo quando tiver essa
-- comprovação, liberando o regime de 8h/dia também para estagiários.
alter table employees add column if not exists comprovante_alternancia boolean default false;
