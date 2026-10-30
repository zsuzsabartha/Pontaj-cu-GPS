-- Phase 1 Schema Migration for PontajSmart (Idempotent)

IF COL_LENGTH('timesheets', 'notes') IS NULL
    ALTER TABLE timesheets ADD notes NVARCHAR(MAX) NULL;

IF COL_LENGTH('timesheets', 'distance_to_office') IS NULL
    ALTER TABLE timesheets ADD distance_to_office INT NULL;

IF COL_LENGTH('timesheets', 'end_distance_to_office') IS NULL
    ALTER TABLE timesheets ADD end_distance_to_office INT NULL;

IF COL_LENGTH('breaks', 'start_lat') IS NULL
    ALTER TABLE breaks ADD start_lat DECIMAL(10,8) NULL;

IF COL_LENGTH('breaks', 'start_long') IS NULL
    ALTER TABLE breaks ADD start_long DECIMAL(11,8) NULL;

IF COL_LENGTH('breaks', 'end_lat') IS NULL
    ALTER TABLE breaks ADD end_lat DECIMAL(10,8) NULL;

IF COL_LENGTH('breaks', 'end_long') IS NULL
    ALTER TABLE breaks ADD end_long DECIMAL(11,8) NULL;

IF COL_LENGTH('breaks', 'start_distance_to_office') IS NULL
    ALTER TABLE breaks ADD start_distance_to_office INT NULL;

IF COL_LENGTH('breaks', 'end_distance_to_office') IS NULL
    ALTER TABLE breaks ADD end_distance_to_office INT NULL;

IF OBJECT_ID('timesheet_logs', 'U') IS NULL
BEGIN
    CREATE TABLE timesheet_logs (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        timesheet_id NVARCHAR(50) NOT NULL,
        changed_by_user_id NVARCHAR(50) NOT NULL,
        change_date DATETIME2 NOT NULL,
        details NVARCHAR(MAX) NULL
    );
    CREATE INDEX IX_timesheet_logs_timesheet_id ON timesheet_logs(timesheet_id);
END;

IF COL_LENGTH('leave_requests', 'cancellation_reason') IS NULL
    ALTER TABLE leave_requests ADD cancellation_reason NVARCHAR(MAX) NULL;

IF COL_LENGTH('leave_requests', 'created_at') IS NULL
    ALTER TABLE leave_requests ADD created_at DATETIME2 NULL;

IF OBJECT_ID('schedule_plans', 'U') IS NULL
BEGIN
    CREATE TABLE schedule_plans (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        user_id NVARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        schedule_id NVARCHAR(50) NOT NULL
    );
    CREATE UNIQUE INDEX UX_schedule_plans_user_date ON schedule_plans(user_id, date);
END;

IF OBJECT_ID('app_settings', 'U') IS NULL
BEGIN
    CREATE TABLE app_settings (
        setting_key NVARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value NVARCHAR(MAX) NULL,
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_by NVARCHAR(50) NULL
    );
END;

-- Ensure PontajAppUser has DML permissions on the new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet_logs TO PontajAppUser;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_plans TO PontajAppUser;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO PontajAppUser;
