-- Funcionário em home office pode bater o ponto de qualquer localização, sem o limitador
-- de geofencing por cidade/sede (que continua valendo normalmente pra todos os outros).
alter table employees add column if not exists home_office boolean default false;
